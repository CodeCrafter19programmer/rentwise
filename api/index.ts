import type { VercelRequest, VercelResponse } from "@vercel/node";
import express from "express";
import { randomUUID } from "crypto";
import serverless from "serverless-http";

// Create Express app instance
const app = express();

// Request ID middleware
app.use((req, res, next) => {
  const requestId = req.get("x-request-id") || randomUUID();
  (req as any).requestId = requestId;
  res.setHeader("x-request-id", requestId);
  next();
});

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health check - inline to avoid import issues
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const requestId = (req as any).requestId;
  res.status(status).json({ message: "Internal Server Error", requestId });
});

// Create serverless handler
const serverlessHandler = serverless(app);

// Vercel serverless function handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Remove /api prefix from the path for Express routing
  const originalUrl = req.url || "";
  const pathWithoutApi = originalUrl.replace(/^\/api/, "") || "/";
  (req as any).url = pathWithoutApi;

  return serverlessHandler(req as any, res as any);
}

