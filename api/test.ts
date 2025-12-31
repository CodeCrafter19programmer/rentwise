import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[MINIMAL TEST] Request received:', req.method, req.url);
  
  return res.status(200).json({
    success: true,
    message: "Minimal test endpoint works",
    method: req.method,
    timestamp: new Date().toISOString(),
  });
}
