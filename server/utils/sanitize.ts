/**
 * Input sanitization utilities for preventing XSS and other injection attacks
 */

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(str: string): string {
  if (typeof str !== "string") return str;
  
  const htmlEscapes: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
    "`": "&#x60;",
    "=": "&#x3D;",
  };
  
  return str.replace(/[&<>"'`=/]/g, (char) => htmlEscapes[char] || char);
}

/**
 * Remove potentially dangerous HTML tags and attributes
 * Simple allowlist-based sanitizer
 */
export function sanitizeHtml(str: string): string {
  if (typeof str !== "string") return str;
  
  // Remove script tags and their content
  let sanitized = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  
  // Remove event handlers
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "");
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, "");
  
  // Remove javascript: URLs
  sanitized = sanitized.replace(/javascript:/gi, "");
  
  // Remove data: URLs (can be used for XSS)
  sanitized = sanitized.replace(/data:/gi, "");
  
  // Remove vbscript: URLs
  sanitized = sanitized.replace(/vbscript:/gi, "");
  
  return sanitized;
}

/**
 * Sanitize a string for safe use in SQL LIKE patterns
 * Escapes special LIKE characters: %, _, [
 */
export function sanitizeLikePattern(str: string): string {
  if (typeof str !== "string") return str;
  
  return str
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/\[/g, "\\[");
}

/**
 * Strip all HTML tags from a string
 */
export function stripHtml(str: string): string {
  if (typeof str !== "string") return str;
  
  return str.replace(/<[^>]*>/g, "");
}

/**
 * Sanitize user input for general text fields
 * - Trims whitespace
 * - Normalizes unicode
 * - Removes control characters (except newlines and tabs)
 */
export function sanitizeText(str: string): string {
  if (typeof str !== "string") return str;
  
  return str
    .trim()
    .normalize("NFC")
    // Remove control characters except \n and \t
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

/**
 * Sanitize an object's string values recursively
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  sanitizer: (str: string) => string = sanitizeText
): T {
  if (!obj || typeof obj !== "object") return obj;
  
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      sanitized[key] = sanitizer(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === "string"
          ? sanitizer(item)
          : typeof item === "object" && item !== null
          ? sanitizeObject(item as Record<string, unknown>, sanitizer)
          : item
      );
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>, sanitizer);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized as T;
}
