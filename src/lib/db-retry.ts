import { Prisma } from "@prisma/client";

/**
 * Retries a Prisma Serializable transaction on write-conflict errors (P2034).
 * Postgres aborts one side of a serialization conflict by design — the caller
 * is expected to retry, not surface it as a user-facing failure.
 */
export async function withSerializableRetry<T>(
    fn: () => Promise<T>,
    maxAttempts = 3,
): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            const isConflict =
                error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
            if (!isConflict || attempt === maxAttempts) throw error;
        }
    }
    throw lastError;
}
