import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "crypto";

// Native Vercel handler - no serverless-http
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = (req.headers["x-request-id"] as string) || randomUUID();
  res.setHeader("x-request-id", requestId);

  // Remove /api prefix for routing
  const path = (req.url || "").replace(/^\/api/, "") || "/";

  try {
    // Health check
    if (path === "/health" && req.method === "GET") {
      return res.status(200).json({ 
        status: "ok", 
        timestamp: new Date().toISOString(),
        requestId 
      });
    }

    // 404 for unmatched routes
    return res.status(404).json({ message: "Not found", requestId });
  } catch (error) {
    console.error("[API Error]", error);
    return res.status(500).json({ message: "Internal Server Error", requestId });
  }
}

