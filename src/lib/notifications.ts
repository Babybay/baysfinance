import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const log = createLogger("notifications");

export type NotificationType =
    | "deadline_h3"        // 3 days before tax deadline
    | "deadline_h1"        // 1 day before tax deadline
    | "invoice_overdue_7"  // invoice unpaid 7+ days past due
    | "permit_status_change";

/**
 * Check if a notification was already sent for this type + reference combo.
 * If not, log it and return false (= "not yet sent, go ahead").
 * If already sent, return true (= "skip").
 */
export async function wasAlreadyNotified(
    type: NotificationType,
    referenceId: string,
): Promise<boolean> {
    const existing = await prisma.notificationLog.findUnique({
        where: { type_referenceId: { type, referenceId } },
    });
    return !!existing;
}

/**
 * Record that a notification was sent. Uses upsert to be idempotent.
 */
export async function logNotification(
    type: NotificationType,
    referenceId: string,
    clientId: string,
    payload?: Record<string, unknown>,
): Promise<void> {
    await prisma.notificationLog.upsert({
        where: { type_referenceId: { type, referenceId } },
        create: { type, referenceId, clientId, payload: payload ?? undefined },
        update: {},
    });
}

/**
 * Filter a list of items to only those that haven't been notified yet,
 * then log them all. Returns the un-notified items.
 */
export async function filterAndLogNew<T extends { id: string; clientId: string }>(
    type: NotificationType,
    items: T[],
    buildPayload?: (item: T) => Record<string, unknown>,
): Promise<T[]> {
    if (items.length === 0) return [];

    // Batch-check which ones were already notified
    const alreadySent = await prisma.notificationLog.findMany({
        where: {
            type,
            referenceId: { in: items.map((i) => i.id) },
        },
        select: { referenceId: true },
    });

    const sentSet = new Set(alreadySent.map((n) => n.referenceId));
    const newItems = items.filter((i) => !sentSet.has(i.id));

    // Log all new notifications
    if (newItems.length > 0) {
        await prisma.notificationLog.createMany({
            data: newItems.map((item) => ({
                type,
                referenceId: item.id,
                clientId: item.clientId,
                payload: buildPayload ? buildPayload(item) : undefined,
            })),
            skipDuplicates: true,
        });

        log.info({ type, count: newItems.length }, "Logged new notifications");
    }

    return newItems;
}

/**
 * POST an event to the n8n webhook URL (if configured).
 * This enables push-based (real-time) notifications alongside the polling cron approach.
 */
export async function pushToN8n(
    event: string,
    data: Record<string, unknown>,
): Promise<boolean> {
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!webhookUrl) {
        log.debug({ event }, "N8N_WEBHOOK_URL not configured, skipping push");
        return false;
    }

    try {
        const res = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event, timestamp: new Date().toISOString(), data }),
        });

        if (!res.ok) {
            log.warn({ event, status: res.status }, "n8n webhook returned non-OK");
            return false;
        }

        log.info({ event }, "Pushed event to n8n");
        return true;
    } catch (err) {
        log.error({ err, event }, "Failed to push to n8n webhook");
        return false;
    }
}
