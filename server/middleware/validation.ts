import { Request, Response, NextFunction } from "express";
import { z, ZodSchema } from "zod";

/**
 * Middleware factory to validate request body against a Zod schema
 */
export function validateBody<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.body);
      
      if (!result.success) {
        const errors = result.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        }));
        
        return res.status(400).json({
          message: "Validation failed",
          errors,
        });
      }
      
      req.body = result.data;
      next();
    } catch (error) {
      return res.status(400).json({ message: "Invalid request body" });
    }
  };
}

/**
 * Middleware factory to validate query parameters against a Zod schema
 */
export function validateQuery<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.query);
      
      if (!result.success) {
        const errors = result.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        }));
        
        return res.status(400).json({
          message: "Invalid query parameters",
          errors,
        });
      }
      
      req.query = result.data;
      next();
    } catch (error) {
      return res.status(400).json({ message: "Invalid query parameters" });
    }
  };
}

/**
 * Middleware factory to validate route parameters against a Zod schema
 */
export function validateParams<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.params);
      
      if (!result.success) {
        const errors = result.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        }));
        
        return res.status(400).json({
          message: "Invalid route parameters",
          errors,
        });
      }
      
      req.params = result.data;
      next();
    } catch (error) {
      return res.status(400).json({ message: "Invalid route parameters" });
    }
  };
}
