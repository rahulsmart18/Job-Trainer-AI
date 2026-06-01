import { NextResponse } from "next/server";

/**
 * Lightweight in-memory sliding-window rate limiter.
 *
 * Suitable for a single server instance / dev. For multi-instance production,
 * swap the Map for a shared store (Redis / Upstash) behind the same interface.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Periodically drop expired buckets so the Map doesn't grow unbounded.
let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitOptions = {
  /** Max requests allowed within the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return { allowed: true, remaining: options.limit - 1, retryAfterSeconds: 0 };
  }

  if (existing.count >= options.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: options.limit - existing.count,
    retryAfterSeconds: 0,
  };
}

/** Best-effort client identifier when there is no authenticated user. */
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Enforce a rate limit for a route. Returns a 429 NextResponse when the limit
 * is exceeded, or `null` when the request may proceed.
 */
export function enforceRateLimit(
  request: Request,
  scope: string,
  identifier: string | null | undefined,
  options: RateLimitOptions,
): NextResponse | null {
  const id = identifier && identifier.length > 0 ? identifier : clientIp(request);
  const result = checkRateLimit(`${scope}:${id}`, options);
  if (result.allowed) return null;

  return NextResponse.json(
    { error: "Too many requests. Please slow down and try again shortly." },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
        "X-RateLimit-Remaining": "0",
      },
    },
  );
}
