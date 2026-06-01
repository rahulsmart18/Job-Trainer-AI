/**
 * Small input-validation helpers for API routes. These guard against oversized
 * payloads and unexpected types before data reaches the AI providers or the DB.
 */

export const LIMITS = {
  /** Free-text answers / intros analyzed by AI. */
  longText: 6_000,
  /** Short single-line fields (role, degree, domain, etc.). */
  shortText: 200,
  /** Medium fields (career goal sentences). */
  mediumText: 600,
} as const;

/** Coerce an unknown value to a trimmed, length-capped string. */
export function cleanString(value: unknown, maxLen: number = LIMITS.shortText): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLen);
}

/** Coerce an unknown value to a string only if present; otherwise undefined. */
export function optionalString(value: unknown, maxLen: number = LIMITS.shortText): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLen) : undefined;
}

/** Clamp an unknown numeric value into [min, max], or null when invalid. */
export function clampNumber(value: unknown, min: number, max: number): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/**
 * Safely parse a JSON request body with a hard size cap to prevent memory abuse.
 * Returns `null` if the body is too large or not valid JSON.
 */
export async function parseJsonBody<T>(request: Request, maxBytes = 100_000): Promise<T | null> {
  const lengthHeader = request.headers.get("content-length");
  if (lengthHeader && Number(lengthHeader) > maxBytes) return null;

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return null;
  }
  if (raw.length > maxBytes) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
