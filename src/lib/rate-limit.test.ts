import { describe, it, expect, beforeEach } from "vitest";
import { createRateLimiter } from "./rate-limit";
import { prisma } from "./prisma";

const TEST_LIMITER_NAMES = ["test-allow", "test-block", "test-isolate"];

beforeEach(async () => {
    // Buckets persist in Postgres across runs — clear this suite's rows so
    // each test starts from a clean window count.
    for (const name of TEST_LIMITER_NAMES) {
        await prisma.rateLimitBucket.deleteMany({ where: { id: { startsWith: `${name}:` } } });
    }
});

describe("createRateLimiter", () => {
    it("allows requests within limit", async () => {
        const limiter = createRateLimiter("test-allow", { limit: 3, windowMs: 60_000 });
        expect((await limiter.check("user1")).success).toBe(true);
        expect((await limiter.check("user1")).success).toBe(true);
        expect((await limiter.check("user1")).success).toBe(true);
    });

    it("blocks requests exceeding limit", async () => {
        const limiter = createRateLimiter("test-block", { limit: 2, windowMs: 60_000 });
        expect((await limiter.check("user1")).success).toBe(true);
        expect((await limiter.check("user1")).success).toBe(true);

        const third = await limiter.check("user1");
        expect(third.success).toBe(false);
        if (!third.success) {
            expect(third.retryAfterMs).toBeGreaterThan(0);
        }
    });

    it("isolates keys from each other", async () => {
        const limiter = createRateLimiter("test-isolate", { limit: 1, windowMs: 60_000 });
        expect((await limiter.check("user1")).success).toBe(true);
        expect((await limiter.check("user2")).success).toBe(true);

        // user1 is blocked, user2 is not
        expect((await limiter.check("user1")).success).toBe(false);
        expect((await limiter.check("user2")).success).toBe(false);
    });
});
