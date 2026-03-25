import { describe, it, expect } from "vitest";
import { createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
    it("allows requests within limit", () => {
        const limiter = createRateLimiter("test-allow", { limit: 3, windowMs: 60_000 });
        expect(limiter.check("user1").success).toBe(true);
        expect(limiter.check("user1").success).toBe(true);
        expect(limiter.check("user1").success).toBe(true);
    });

    it("blocks requests exceeding limit", () => {
        const limiter = createRateLimiter("test-block", { limit: 2, windowMs: 60_000 });
        expect(limiter.check("user1").success).toBe(true);
        expect(limiter.check("user1").success).toBe(true);

        const third = limiter.check("user1");
        expect(third.success).toBe(false);
        if (!third.success) {
            expect(third.retryAfterMs).toBeGreaterThan(0);
        }
    });

    it("isolates keys from each other", () => {
        const limiter = createRateLimiter("test-isolate", { limit: 1, windowMs: 60_000 });
        expect(limiter.check("user1").success).toBe(true);
        expect(limiter.check("user2").success).toBe(true);

        // user1 is blocked, user2 is not
        expect(limiter.check("user1").success).toBe(false);
        expect(limiter.check("user2").success).toBe(false);
    });
});
