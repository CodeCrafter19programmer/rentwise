type AnyError = {
  message?: unknown;
  details?: unknown;
  hint?: unknown;
  code?: unknown;
  status?: unknown;
};

function asAnyError(err: unknown): AnyError {
  if (err && typeof err === "object") return err as AnyError;
  return {};
}

export function getSupabaseErrorMessage(err: unknown): string {
  const e = asAnyError(err);
  const message = typeof e.message === "string" ? e.message : undefined;
  const details = typeof e.details === "string" ? e.details : undefined;
  const hint = typeof e.hint === "string" ? e.hint : undefined;

  const combined = [message, details, hint].filter(Boolean).join(" ").trim();
  const lower = combined.toLowerCase();

  if (lower.includes("row level security") || lower.includes("permission denied") || lower.includes("not allowed")) {
    return "You don’t have permission to perform this action.";
  }

  if (lower.includes("jwt expired") || lower.includes("invalid jwt") || lower.includes("invalid token")) {
    return "Your session has expired. Please sign in again.";
  }

  if (lower.includes("failed to fetch") || lower.includes("networkerror") || lower.includes("network error")) {
    return "Network error. Please check your connection and try again.";
  }

  if (combined) return combined;

  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;

  return "Something went wrong. Please try again.";
}
