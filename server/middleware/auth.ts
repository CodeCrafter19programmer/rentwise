import { Request, Response, NextFunction } from "express";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Lazy-initialize Supabase client to avoid startup errors
let supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (supabase) return supabase;
  
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";
  
  if (!supabaseUrl || !supabaseKey) {
    console.warn("Supabase not configured - auth middleware will reject all requests");
    return null;
  }
  
  supabase = createClient(supabaseUrl, supabaseKey);
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
    const client = getSupabaseClient();
    if (!client) {
      return res.status(503).json({ message: "Authentication service unavailable" });
    }

    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Missing or invalid authorization header" });
    }

    const token = authHeader.substring(7);
    
    // Verify the JWT token with Supabase
    const { data: { user }, error } = await client.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // Fetch user profile for role information
    const { data: profile } = await client
      .from("profiles")
      .select("id, email, role")
      .eq("id", user.id)
      .single();

    req.user = {
      id: user.id,
      email: user.email || "",
      role: (profile?.role as "admin" | "manager" | "tenant") || "tenant",
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({ message: "Authentication error" });
  }
}

/**
 * Middleware to require specific roles
 */
export function requireRole(...allowedRoles: Array<"admin" | "manager" | "tenant">) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: "You don't have permission to access this resource" 
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
        .single();

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
