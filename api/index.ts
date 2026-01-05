import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "crypto";

// Native Vercel handler - Express was causing issues
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = (req.headers["x-request-id"] as string) || randomUUID();
  res.setHeader("x-request-id", requestId);

  // Remove /api prefix for routing
  const path = (req.url || "").replace(/^\/api/, "").split("?")[0] || "/";
  const method = req.method || "GET";

  try {
    // Health check
    if (path === "/health" && method === "GET") {
      return res.status(200).json({ 
        status: "ok", 
        timestamp: new Date().toISOString(),
        requestId 
      });
    }

    // For all other routes, return 404 with requestId
    return res.status(404).json({ message: "Not found", requestId });
  } catch (error: any) {
    console.error("[API Error]", error);
    return res.status(500).json({ message: "Internal Server Error", requestId });
  }
}
