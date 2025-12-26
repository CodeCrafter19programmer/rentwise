import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Protected API routes example - maintenance requests
  app.post(
    "/api/maintenance-requests",
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
    "/api/messages",
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
    "/api/admin/users",
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

  // Manager route example
  app.get(
    "/api/manager/properties",
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
