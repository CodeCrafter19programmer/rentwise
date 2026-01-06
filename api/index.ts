import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client - use VITE_ fallback for all env vars
function getSupabaseClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("[SUPABASE] Missing config:", { hasUrl: !!url, hasKey: !!key });
    return null;
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

// Parse JSON body safely
async function parseJsonBody(req: VercelRequest): Promise<{ data: any; error: string | null }> {
  try {
    if (req.body && typeof req.body === "object") {
      return { data: req.body, error: null };
    }
    return { data: null, error: null };
  } catch {
    return { data: null, error: "Invalid JSON" };
  }
}

// Verify auth token
async function verifyAuth(req: VercelRequest): Promise<{ user: any; error: string | null }> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return { user: null, error: "Missing or invalid authorization header" };
  }

  const token = authHeader.substring(7);
  const client = getSupabaseClient();
  if (!client) {
    return { user: null, error: "Authentication service unavailable" };
  }

  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) {
    return { user: null, error: "Invalid or expired token" };
  }

  return { user, error: null };
}

// Native Vercel handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = (req.headers["x-request-id"] as string) || randomUUID();
  res.setHeader("x-request-id", requestId);

  const path = (req.url || "").replace(/^\/api/, "").split("?")[0] || "/";
  const method = req.method || "GET";

  try {
    // Health check
    if (path === "/health" && method === "GET") {
      return res.status(200).json({ 
        status: "ok", 
        timestamp: new Date().toISOString(),
        requestId,
      });
    }

    // Protected routes - require auth
    if (path.startsWith("/messages") || path.startsWith("/admin") || path.startsWith("/manager")) {
      const { user, error: authError } = await verifyAuth(req);
      if (authError) {
        return res.status(401).json({ message: authError, requestId });
      }

      // POST /messages - validate body
      if (path === "/messages" && method === "POST") {
        const { data: body, error: parseError } = await parseJsonBody(req);
        if (parseError) {
          return res.status(400).json({ message: parseError, requestId });
        }
        
        if (!body?.receiverId || !body?.content) {
          return res.status(400).json({ message: "Missing required fields", requestId });
        }

        return res.status(201).json({ 
          message: "Message sent", 
          senderId: user.id,
          requestId 
        });
      }

      // GET /admin/users
      if (path === "/admin/users" && method === "GET") {
        return res.status(200).json({ message: "Admin users endpoint", users: [], requestId });
      }

      // POST /admin/managers - handled by separate file api/admin/managers.ts
      // POST /admin/invite
      if (path === "/admin/invite" && method === "POST") {
        const { data: body, error: parseError } = await parseJsonBody(req);
        if (parseError) {
          return res.status(400).json({ message: parseError, requestId });
        }

        return res.status(200).json({ message: "Invite endpoint", requestId });
      }

      // GET /manager/properties
      if (path === "/manager/properties" && method === "GET") {
        return res.status(200).json({ message: "Manager properties", properties: [], requestId });
      }
    }

    // POST /maintenance-requests
    if (path === "/maintenance-requests" && method === "POST") {
      const { user, error: authError } = await verifyAuth(req);
      if (authError) {
        return res.status(401).json({ message: authError, requestId });
      }

      const { data: body, error: parseError } = await parseJsonBody(req);
      if (parseError) {
        return res.status(400).json({ message: parseError, requestId });
      }

      return res.status(201).json({ message: "Maintenance request created", requestId });
    }

    // 404 for unmatched routes
    return res.status(404).json({ message: "Not found", requestId });
  } catch (error: any) {
    console.error("[API Error]", error);
    return res.status(500).json({ message: "Internal Server Error", requestId });
  }
}
