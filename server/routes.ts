import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { storage } from "./storage";
import { requireAuth, requireRole, AuthenticatedRequest } from "./middleware/auth";
import { validateBody, validateParams } from "./middleware/validation";
import { sanitizeText, sanitizeObject } from "./utils/sanitize";

// Validation schemas
const idParamSchema = z.object({
  id: z.string().uuid("Invalid ID format"),
});

const maintenanceRequestSchema = z.object({
  title: z.string().min(1).max(200).transform(sanitizeText),
  description: z.string().min(10).max(2000).transform(sanitizeText),
  priority: z.enum(["low", "medium", "high"]),
  unitId: z.string().uuid(),
});

const messageSchema = z.object({
  receiverId: z.string().uuid(),
  subject: z.string().max(200).optional().transform((val) => val ? sanitizeText(val) : val),
  content: z.string().min(1).max(5000).transform(sanitizeText),
});

const adminInviteSchema = z.object({
  email: z.string().email().transform(sanitizeText),
  role: z.enum(["admin", "manager", "tenant"]),
});

const createManagerSchema = z.object({
  name: z.string().min(1).max(200).transform(sanitizeText),
  email: z.string().email().transform(sanitizeText),
  phone: z.string().min(10).max(20).transform(sanitizeText),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Health check endpoint
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Test endpoint without middleware
  app.post("/admin/managers-test", async (req, res) => {
    try {
      console.log('[TEST] Manager test endpoint hit');
      console.log('[TEST] Body:', req.body);
      
      const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
      
      console.log('[TEST] URL configured:', !!supabaseUrl);
      console.log('[TEST] Service key configured:', !!supabaseServiceKey);
      
      if (!supabaseUrl || !supabaseServiceKey) {
        return res.status(500).json({ 
          message: "Missing env vars",
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseServiceKey
        });
      }
      
      return res.json({ 
        message: "Test endpoint working",
        envVarsOk: true
      });
    } catch (error: any) {
      console.error('[TEST] Error:', error);
      return res.status(500).json({ message: error.message });
    }
  });

  // Protected API routes example - maintenance requests
  app.post(
    "/maintenance-requests",
    requireAuth,
    requireRole("tenant"),
    validateBody(maintenanceRequestSchema),
    async (req: AuthenticatedRequest, res) => {
      try {
        const data = sanitizeObject(req.body);
        // Here you would insert into database via Supabase or storage
        res.status(201).json({ 
          message: "Maintenance request created",
          data: { ...data, tenantId: req.user?.id }
        });
      } catch (error) {
        res.status(500).json({ message: "Failed to create maintenance request" });
      }
    }
  );

  // Protected API routes example - messages
  app.post(
    "/messages",
    requireAuth,
    validateBody(messageSchema),
    async (req: AuthenticatedRequest, res) => {
      try {
        const data = sanitizeObject(req.body);
        res.status(201).json({ 
          message: "Message sent",
          data: { ...data, senderId: req.user?.id }
        });
      } catch (error) {
        res.status(500).json({ message: "Failed to send message" });
      }
    }
  );

  // Admin-only route example
  app.get(
    "/admin/users",
    requireAuth,
    requireRole("admin"),
    async (_req: AuthenticatedRequest, res) => {
      try {
        // Fetch users from database
        res.json({ message: "Admin users endpoint", users: [] });
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch users" });
      }
    }
  );

  app.post(
    "/admin/managers",
    requireAuth,
    requireRole("admin"),
    validateBody(createManagerSchema),
    async (req: AuthenticatedRequest, res) => {
      try {
        console.log('[CREATE MANAGER] Starting manager creation...');
        console.log('[CREATE MANAGER] User:', req.user?.email, 'Role:', req.user?.role);
        
        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

        console.log('[CREATE MANAGER] Supabase URL configured:', !!supabaseUrl);
        console.log('[CREATE MANAGER] Service key configured:', !!supabaseServiceKey);

        if (!supabaseUrl || !supabaseServiceKey) {
          console.error('[CREATE MANAGER] Missing environment variables');
          return res.status(500).json({
            message: "Server is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
          });
        }

        console.log('[CREATE MANAGER] Creating Supabase admin client...');
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
          auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
        });

        const { name, email, phone } = req.body as z.infer<typeof createManagerSchema>;
        console.log('[CREATE MANAGER] Creating manager:', email);
        
        // Generate temporary password
        const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);

        console.log('[CREATE MANAGER] Calling Supabase admin.createUser...');
        // Create auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            name,
            role: "manager",
          },
        });

        if (authError) {
          console.error('[CREATE MANAGER] Auth error:', authError);
          return res.status(400).json({ message: authError?.message || "Failed to create manager" });
        }

        if (!authData?.user) {
          console.error('[CREATE MANAGER] No user data returned');
          return res.status(400).json({ message: "Failed to create manager - no user data" });
        }

        console.log('[CREATE MANAGER] User created with ID:', authData.user.id);
        console.log('[CREATE MANAGER] Creating profile record...');

        // Create profile record
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .insert({
            id: authData.user.id,
            email,
            name,
            role: "manager",
            phone,
          });

        if (profileError) {
          console.error('[CREATE MANAGER] Profile error:', profileError);
          return res.status(400).json({ message: profileError.message || "Failed to create profile" });
        }

        console.log('[CREATE MANAGER] Manager created successfully');
        return res.json({
          message: "Manager created successfully",
          userId: authData.user.id,
          email,
          name,
          tempPassword,
        });
      } catch (e: any) {
        console.error('[CREATE MANAGER] Unexpected error:', e);
        console.error('[CREATE MANAGER] Error stack:', e?.stack);
        return res.status(500).json({ 
          message: e?.message || "Failed to create manager",
          error: process.env.NODE_ENV === 'development' ? e?.stack : undefined
        });
      }
    }
  );

  app.post(
    "/admin/invite",
    requireAuth,
    requireRole("admin"),
    validateBody(adminInviteSchema),
    async (req: AuthenticatedRequest, res) => {
      const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

      if (!supabaseUrl || !supabaseServiceKey) {
        return res.status(500).json({
          message: "Server is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
        });
      }

      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      });

      try {
        const { email, role } = req.body as z.infer<typeof adminInviteSchema>;
        const redirectTo = process.env.PUBLIC_SITE_URL || process.env.APP_URL;

        const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          data: { role },
          ...(redirectTo ? { redirectTo } : {}),
        });

        if (error || !data?.user) {
          return res.status(400).json({ message: error?.message || "Failed to invite user" });
        }

        const invitedUser = data.user;

        await supabaseAdmin
          .from("profiles")
          .upsert({
            id: invitedUser.id,
            email,
            role,
            name: email.split("@")[0] || "User",
          });

        return res.json({
          message: "Invitation sent",
          userId: invitedUser.id,
          email,
          role,
        });
      } catch (e: any) {
        return res.status(500).json({ message: e?.message || "Failed to invite user" });
      }
    }
  );

  // Manager route example
  app.get(
    "/manager/properties",
    requireAuth,
    requireRole("manager", "admin"),
    async (req: AuthenticatedRequest, res) => {
      try {
        res.json({ 
          message: "Manager properties endpoint", 
          managerId: req.user?.id,
          properties: [] 
        });
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch properties" });
      }
    }
  );

  return httpServer;
}
