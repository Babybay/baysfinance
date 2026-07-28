/**
 * Postgres-backed fixed-window rate limiter.
 *
 * Each check atomically increments a per-(limiter, key, window) counter row
 * via upsert, so limits hold across serverless instances (unlike an
 * in-memory Map, which resets per isolate on Vercel).
 *
 * Fixed windows can allow a short burst at the window boundary (e.g. up to
 * 2x the limit across two adjacent windows) — acceptable here since these
 * limiters guard against sustained abuse, not precise quotas.
 *
 * Old buckets are purged by the cleanup-deleted cron.
 */

import { prisma } from "@/lib/prisma";

interface RateLimiterOptions {
    /** Maximum number of requests allowed in the window */
    limit: number;
    /** Window size in milliseconds */
    windowMs: number;
}

export function createRateLimiter(name: string, options: RateLimiterOptions) {
    const { limit, windowMs } = options;

    return {
        /**
         * Check if a request is allowed for the given key.
         * Returns { success: true } if allowed, or { success: false, retryAfterMs } if rate-limited.
         */
        async check(key: string): Promise<{ success: true } | { success: false; retryAfterMs: number }> {
            const now = Date.now();
            const windowIndex = Math.floor(now / windowMs);
            const id = `${name}:${key}:${windowIndex}`;
            const windowStart = new Date(windowIndex * windowMs);

            const bucket = await prisma.rateLimitBucket.upsert({
                where: { id },
                create: { id, count: 1, windowStart },
                update: { count: { increment: 1 } },
                select: { count: true },
            });

            if (bucket.count > limit) {
                const retryAfterMs = (windowIndex + 1) * windowMs - now;
                return { success: false, retryAfterMs };
            }

            return { success: true };
        },
    };
}

// ── Pre-configured limiters ─────────────────────────────────────────────────

/** Auth endpoints: 10 attempts per 15 minutes per IP */
export const authLimiter = createRateLimiter("auth", {
    limit: 10,
    windowMs: 15 * 60 * 1000,
});

/** OCR/heavy processing: 30 requests per hour per user */
export const ocrLimiter = createRateLimiter("ocr", {
    limit: 30,
    windowMs: 60 * 60 * 1000,
});

/** General API: 100 requests per minute per IP */
export const apiLimiter = createRateLimiter("api", {
    limit: 100,
    windowMs: 60 * 1000,
});

/** Public CRM registration: hard backstop across all website submissions */
export const crmGlobalLimiter = createRateLimiter("crm-global", {
    limit: 10,
    windowMs: 15 * 60 * 1000,
});

/** Public CRM registration: prevents repeated requests for one email address */
export const crmEmailLimiter = createRateLimiter("crm-email", {
    limit: 2,
    windowMs: 15 * 60 * 1000,
});
