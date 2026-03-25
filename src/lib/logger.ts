import pino from "pino";

/**
 * Structured logger for the application.
 *
 * In production: JSON output (queryable by log aggregators like Datadog, Loki).
 * In development: human-readable output.
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   logger.info({ clientId, action: "createJournal" }, "Journal created");
 *   logger.error({ err, invoiceId }, "Failed to create invoice");
 */
export const logger = pino({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),
    ...(process.env.NODE_ENV !== "production" && {
        transport: {
            target: "pino/file",
            options: { destination: 1 }, // stdout
        },
    }),
});

/** Create a child logger scoped to a specific module. */
export function createLogger(module: string) {
    return logger.child({ module });
}
