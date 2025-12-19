import type { VercelRequest, VercelResponse } from "@vercel/node";
import express from "express";
import serverless from "serverless-http";
import { registerRoutes } from "../server/routes";

// Create Express app instance
const app = express();

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
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      console.log(logLine);
    }
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
      app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";
        res.status(status).json({ message });
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
  
  // Create a modified request object
  const modifiedReq = {
    ...req,
    url: pathWithoutApi,
    originalUrl: pathWithoutApi,
    path: pathWithoutApi,
  } as any;

  return handler(modifiedReq, res);
}

