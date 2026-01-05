import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Middleware to set CSRF token cookie on GET requests
 */
export function csrfTokenSetter(req: Request, res: Response, next: NextFunction) {
  // Only set token on GET requests for pages
  if (req.method === "GET" && !req.path.startsWith("/api/")) {
    const token = generateCsrfToken();
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false, // Must be readable by JS to include in requests
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 1000, // 1 hour
    });
  }
  next();
}

/**
 * Middleware to validate CSRF token on state-changing requests
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Skip CSRF check for safe methods
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Skip CSRF for API routes that use different auth (e.g., JWT from Supabase)
  // The Supabase client handles its own auth via JWT tokens
  if (req.path.startsWith("/api/")) {
    return next();
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    const requestId = (req as any).requestId;
    return res.status(403).json({ 
      message: "Invalid CSRF token. Please refresh the page and try again.",
      requestId,
    });
  }

  next();
}

/**
 * Endpoint to get a fresh CSRF token
 */
export function getCsrfToken(req: Request, res: Response) {
  const token = generateCsrfToken();
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 1000,
  });
  res.json({ csrfToken: token });
}
