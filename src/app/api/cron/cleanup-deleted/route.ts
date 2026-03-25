import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const log = createLogger("cron:cleanup-deleted");

/**
 * GDPR / data retention cron.
 * Permanently deletes records that were soft-deleted more than 90 days ago.
 *
 * Protected by CRON_SECRET (enforced in middleware.ts).
 * Schedule: daily (recommended via external cron scheduler).
 */

const RETENTION_DAYS = 90;

// Models with soft-delete (deletedAt column), ordered leaf → parent
// to respect foreign key constraints.
const SOFT_DELETE_MODELS = [
    "Payment",
    "JournalEntry",   // cascades delete JournalItems via onDelete:Cascade
    "Invoice",
    "Document",
    "RecurringInvoice",
    "PermitCase",
    "TaxDeadline",
    "Account",
    "ImportBatch",
    "FixedAsset",
    "Client",
] as const;

export async function GET() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

    const results: { model: string; deleted: number }[] = [];
    let totalDeleted = 0;

    for (const model of SOFT_DELETE_MODELS) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const delegate = (prisma as any)[model.charAt(0).toLowerCase() + model.slice(1)];
            if (!delegate?.deleteMany) continue;

            // Hard-delete records soft-deleted before the cutoff
            // Note: the soft-delete middleware only intercepts findMany/findFirst/findUnique.
            // deleteMany on already-soft-deleted records does a real DELETE.
            const result = await delegate.deleteMany({
                where: {
                    deletedAt: { not: null, lt: cutoff },
                },
            });

            if (result.count > 0) {
                results.push({ model, deleted: result.count });
                totalDeleted += result.count;
                log.info({ model, deleted: result.count }, "Hard-deleted expired records");
            }
        } catch (err) {
            log.error({ err, model }, "Failed to cleanup model");
        }
    }

    log.info({ totalDeleted, modelsAffected: results.length }, "Cleanup completed");

    return NextResponse.json({
        success: true,
        retentionDays: RETENTION_DAYS,
        cutoff: cutoff.toISOString(),
        totalDeleted,
        details: results,
    });
}
