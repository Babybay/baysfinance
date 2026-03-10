"use server";

import { prisma } from "@/lib/prisma";
import { TaxDeadlineStatus } from "@prisma/client";

// ─── GET DEADLINES ───────────────────────────────────────────────────────────

export async function getDeadlines(clientId?: string) {
    try {
        const deadlines = await prisma.taxDeadline.findMany({
            where: clientId ? { clientId } : undefined,
            include: { client: { select: { nama: true } } },
            orderBy: { tanggalBatas: "asc" },
        });

        const mappedDeadlines = deadlines.map(d => ({
            ...d,
            clientName: d.client.nama
        }));

        return { success: true, data: mappedDeadlines };
    } catch (error) {
        console.error("getDeadlines error:", error);
        return { success: false, data: [], error: "Gagal mengambil data deadline" };
    }
}

// ─── UPDATE DEADLINE STATUS ──────────────────────────────────────────────────

export async function updateDeadlineStatus(id: string, status: TaxDeadlineStatus, userId?: string) {
    try {
        const deadline = await prisma.taxDeadline.update({
            where: { id },
            data: {
                status,
                reportedAt: status === TaxDeadlineStatus.SudahLapor ? new Date() : undefined,
                updatedBy: userId || null,
            },
        });
        return { success: true, data: deadline };
    } catch (error) {
        console.error("updateDeadlineStatus error:", error);
        return { success: false, error: "Gagal mengupdate status deadline" };
    }
}
