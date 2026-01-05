import { Request, Response, NextFunction } from "express";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Lazy-initialize Supabase client to avoid startup errors
let supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (supabase) return supabase;
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error("[AUTH] Missing required environment variables: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY");
    return null;
  }
  
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
  return supabase;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: "admin" | "manager" | "tenant";
  };
}

/**
 * Middleware to verify JWT token from Authorization header
 * Extracts user info and attaches to request
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const requestId = (req as any).requestId;
    const client = getSupabaseClient();
    if (!client) {
      console.error("[AUTH] Supabase client not available");
      return res.status(503).json({ message: "Authentication service unavailable", requestId });
    }

    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("[AUTH] Missing or invalid authorization header");
      return res.status(401).json({ message: "Missing or invalid authorization header", requestId });
    }

    const token = authHeader.substring(7);
    
    // Verify the JWT token with Supabase
    const { data: { user }, error } = await client.auth.getUser(token);
    
    if (error || !user) {
      console.error("[AUTH] Token verification failed:", error?.message);
      return res.status(401).json({ message: "Invalid or expired token", requestId });
    }

    // Use role from user metadata if available, otherwise fetch from profile
    let role = user.user_metadata?.role as "admin" | "manager" | "tenant" | undefined;
    
    if (!role) {
      const { data: profile, error: profileError } = await client
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      
      if (profileError) {
        console.error("[AUTH] Profile fetch error:", profileError.message);
      }
      
      role = (profile?.role as "admin" | "manager" | "tenant") || "tenant";
    }

    req.user = {
      id: user.id,
      email: user.email || "",
      role,
    };

    next();
  } catch (error) {
    console.error("[AUTH] Middleware error:", error);
    const requestId = (req as any).requestId;
    return res.status(500).json({ message: "Authentication error", requestId });
  }
}

/**
 * Middleware to require specific roles
 */
export function requireRole(...allowedRoles: Array<"admin" | "manager" | "tenant">) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const requestId = (req as any).requestId;
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required", requestId });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: "You don't have permission to access this resource",
        requestId,
      });
    }

    next();
  };
}

/**
 * Optional auth - attaches user if token present, but doesn't require it
 */
export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const client = getSupabaseClient();
    if (!client) {
      return next();
    }

    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.substring(7);
    const { data: { user } } = await client.auth.getUser(token);
    
    if (user) {
      const { data: profile } = await client
        .from("profiles")
        .select("id, email, role")
        .eq("id", user.id)
        .maybeSingle();

      req.user = {
        id: user.id,
        email: user.email || "",
        role: (profile?.role as "admin" | "manager" | "tenant") || "tenant",
      };
    }

    next();
  } catch {
    next();
  }
}
