import type { VercelRequest, VercelResponse } from "@vercel/node";
import express from "express";
import { randomUUID } from "crypto";
import { registerRoutes } from "../server/routes";
import { log } from "../server/utils/log";

// Create Express app synchronously
const app = express();

// Request ID middleware - first to cover all requests
app.use((req, res, next) => {
  const requestId = req.get("x-request-id") || randomUUID();
  (req as any).requestId = requestId;
  res.setHeader("x-request-id", requestId);
  next();
});

// Body parsing with inline error handling
app.use((req, res, next) => {
  express.json()(req, res, (err) => {
    if (err) {
      const requestId = (req as any).requestId;
      return res.status(400).json({ message: "Invalid JSON", requestId });
    }
    next();
  });
});
app.use(express.urlencoded({ extended: false }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  const requestId = (req as any).requestId;

  res.on("finish", () => {
    const duration = Date.now() - start;
    log(`${req.method} ${path} ${res.statusCode} in ${duration}ms [${requestId}]`, "vercel");
  });

  next();
});

// Track initialization
let routesRegistered = false;

// Error handler
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const requestId = (req as any).requestId;
  const safeMessage = status >= 500 ? "Internal Server Error" : (err.message || "Error");
  console.error("[ERROR]", status, err.message, requestId ? `[${requestId}]` : "");
  res.status(status).json({ message: safeMessage, requestId });
});

// Vercel serverless handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Register routes once
  if (!routesRegistered) {
    await registerRoutes(null as any, app);
    routesRegistered = true;
  }

  // Remove /api prefix for Express routing
  const originalUrl = req.url || "";
  req.url = originalUrl.replace(/^\/api/, "") || "/";

  // Use Express to handle the request
  return new Promise<void>((resolve) => {
    res.on("finish", resolve);
    res.on("close", resolve);
    app(req as any, res as any);
  });
}
