import type { VercelRequest, VercelResponse } from "@vercel/node";
import express from "express";
import { randomUUID } from "crypto";
import serverless from "serverless-http";
import { registerRoutes } from "../server/routes";
import { log } from "../server/utils/log";

// Create Express app instance
const app = express();

app.use((req, res, next) => {
  const requestId = req.get("x-request-id") || randomUUID();
  (req as any).requestId = requestId;
  res.setHeader("x-request-id", requestId);
  next();
});

// Middleware setup
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  const requestId = (req as any).requestId;

  res.on("finish", () => {
    const duration = Date.now() - start;
    const contentType = res.getHeader("content-type");
    const isJson = typeof contentType === "string" && contentType.includes("application/json");
    if (!isJson) return;

    log(`${req.method} ${path} ${res.statusCode} in ${duration}ms [${requestId}]`, "vercel");
  });

  next();
});

// Initialize routes
let routesInitialized = false;
let errorHandlerRegistered = false;

async function initializeRoutes() {
  if (!routesInitialized) {
    await registerRoutes(null as any, app);
    if (!errorHandlerRegistered) {
      app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";
        const requestId = (req as any).requestId;

        if (res.headersSent) {
          return;
        }

        const safeMessage =
          status >= 500 && process.env.NODE_ENV === "production" ? "Internal Server Error" : message;

        console.error("[ERROR]", status, message, requestId ? `[${requestId}]` : "");
        if (process.env.NODE_ENV !== "production") {
          console.error(err.stack);
        }
        res.status(status).json({ message: safeMessage, requestId });
      });
      errorHandlerRegistered = true;
    }
    routesInitialized = true;
  }
}

// Initialize routes before creating serverless handler
let serverlessHandler: ReturnType<typeof serverless> | null = null;

async function getHandler() {
  await initializeRoutes();
  if (!serverlessHandler) {
    serverlessHandler = serverless(app);
  }
  return serverlessHandler;
}

// Vercel serverless function handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const handler = await getHandler();
  
  // Remove /api prefix from the path for Express routing
  const originalUrl = req.url || "";
  const pathWithoutApi = originalUrl.replace(/^\/api/, "") || "/";

  (req as any).url = pathWithoutApi;

  return handler(req as any, res as any);
}

