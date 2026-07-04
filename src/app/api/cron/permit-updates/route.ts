import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { filterAndLogNew } from "@/lib/notifications";
import { createLogger } from "@/lib/logger";

const log = createLogger("cron:permit-updates");

/**
 * Returns permit cases that had a status change in the last 24 hours.
 * Uses PermitActivity log to detect recent status transitions.
 *
 * n8n calls this daily (or more frequently), gets the list,
 * and notifies clients about their permit status changes.
 *
 * Protected by CRON_SECRET (enforced in proxy.ts).
 */
export async function GET() {
    try {
        const since = new Date();
        since.setHours(since.getHours() - 24);

        // Find recent status-change activities
        const recentActivities = await prisma.permitActivity.findMany({
            where: {
                action: "status_change",
                createdAt: { gte: since },
            },
            include: {
                permitCase: {
                    include: {
                        client: { select: { id: true, nama: true, email: true, telepon: true } },
                        permitType: { select: { name: true, slug: true } },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        // Deduplicate: keep only the latest activity per case
        const latestPerCase = new Map<string, (typeof recentActivities)[number]>();
        for (const activity of recentActivities) {
            if (!latestPerCase.has(activity.caseId)) {
                latestPerCase.set(activity.caseId, activity);
            }
        }

        const items = Array.from(latestPerCase.values()).map((act) => {
            const meta = act.metadata as Record<string, string> | null;
            return {
                id: act.id,
                clientId: act.permitCase.clientId,
                clientName: act.permitCase.client.nama,
                clientEmail: act.permitCase.client.email,
                clientPhone: act.permitCase.client.telepon,
                caseId: act.permitCase.caseId,
                permitType: act.permitCase.permitType.name,
                currentStatus: act.permitCase.status,
                previousStatus: meta?.from ?? null,
                newStatus: meta?.to ?? act.permitCase.status,
                description: act.description,
                changedAt: act.createdAt.toISOString(),
            };
        });

        const newItems = await filterAndLogNew("permit_status_change", items);

        log.info({ total: newItems.length }, "Permit update notifications generated");

        return NextResponse.json({
            success: true,
            count: newItems.length,
            updates: newItems,
        });
    } catch (error) {
        log.error({ err: error }, "Failed to generate permit update notifications");
        return NextResponse.json(
            { success: false, error: "Failed to generate permit update notifications" },
            { status: 500 },
        );
    }
}
