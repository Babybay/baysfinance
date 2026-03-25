/**
 * In-memory sliding-window rate limiter.
 *
 * Each limiter instance tracks requests per key (typically IP or userId).
 * Old entries are pruned automatically on each check to prevent memory leaks.
 *
 * For production at scale, replace with Redis-backed solution (e.g. Upstash Ratelimit).
 */

interface RateLimitEntry {
    timestamps: number[];
}

interface RateLimiterOptions {
    /** Maximum number of requests allowed in the window */
    limit: number;
    /** Window size in milliseconds */
    windowMs: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

export function createRateLimiter(name: string, options: RateLimiterOptions) {
    const { limit, windowMs } = options;

    // Share store across hot-reloads in dev
    if (!stores.has(name)) {
        stores.set(name, new Map());
    }
    const store = stores.get(name)!;

    return {
        /**
         * Check if a request is allowed for the given key.
         * Returns { success: true } if allowed, or { success: false, retryAfterMs } if rate-limited.
         */
        check(key: string): { success: true } | { success: false; retryAfterMs: number } {
            const now = Date.now();
            const cutoff = now - windowMs;

            let entry = store.get(key);
            if (!entry) {
                entry = { timestamps: [] };
                store.set(key, entry);
            }

            // Prune expired timestamps
            entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

            if (entry.timestamps.length >= limit) {
                const oldestInWindow = entry.timestamps[0];
                const retryAfterMs = oldestInWindow + windowMs - now;
                return { success: false, retryAfterMs };
            }

            entry.timestamps.push(now);
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
