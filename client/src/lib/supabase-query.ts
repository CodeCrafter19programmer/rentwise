/**
 * Supabase query utilities with user-friendly error handling
 * RCA-010: Provides wrappers that convert raw Supabase errors to user-friendly messages
 */

import { getSupabaseErrorMessage } from "./supabase-error";

/**
 * Wraps a Supabase query result and throws a user-friendly error if needed
 */
export function handleSupabaseResult<T>(
  result: { data: T | null; error: any },
  context?: string
): T {
  if (result.error) {
    const message = getSupabaseErrorMessage(result.error);
    throw new Error(context ? `${context}: ${message}` : message);
  }
  
  if (result.data === null) {
    throw new Error(context ? `${context}: No data returned` : "No data returned");
  }
  
  return result.data;
}

/**
 * Wraps a Supabase query result, returning null instead of throwing for missing data
 */
export function handleSupabaseResultOptional<T>(
  result: { data: T | null; error: any },
  context?: string
): T | null {
  if (result.error) {
    const message = getSupabaseErrorMessage(result.error);
    throw new Error(context ? `${context}: ${message}` : message);
  }
  
  return result.data;
}

/**
 * Safe query executor that catches errors and returns user-friendly messages
 */
export async function safeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  context?: string
): Promise<{ data: T | null; error: string | null }> {
  try {
    const result = await queryFn();
    
    if (result.error) {
      return { 
        data: null, 
        error: getSupabaseErrorMessage(result.error) 
      };
    }
    
    return { data: result.data, error: null };
  } catch (err) {
    return { 
      data: null, 
      error: getSupabaseErrorMessage(err) 
    };
  }
}
