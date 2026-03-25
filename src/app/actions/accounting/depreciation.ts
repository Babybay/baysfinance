"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { assertCanAccessClient, handleAuthError, isAdminOrStaff } from "@/lib/auth-helpers";
import { createDepreciationJournal } from "@/lib/auto-journal";
import { round2 } from "@/lib/accounting-helpers";
import { createLogger } from "@/lib/logger";

const log = createLogger("depreciation");

/**
 * Get all fixed assets for a client (for the depreciation UI).
 */
export async function getFixedAssets(clientId: string) {
    try {
        await assertCanAccessClient(clientId);

        const assets = await prisma.fixedAsset.findMany({
            where: { clientId },
            orderBy: { name: "asc" },
        });

        return {
            success: true,
            data: assets.map((a) => ({
                id: a.id,
                name: a.name,
                acquisitionDate: a.acquisitionDate,
                quantity: a.quantity,
                depreciationRate: Number(a.depreciationRate),
                costCurrent: Number(a.costCurrent),
                accumDeprecCurrent: Number(a.accumDeprecCurrent),
                bookValue: Number(a.bookValue),
            })),
        };
    } catch (error) {
        log.error({ err: error }, "getFixedAssets failed");
        return handleAuthError(error);
    }
}

/**
 * Calculate monthly depreciation for all fixed assets of a client
 * and create a single journal entry.
 *
 * Depreciation formula (straight-line monthly):
 *   monthly = (costCurrent * depreciationRate) / 12
 */
export async function runMonthlyDepreciation(data: {
    clientId: string;
    period: string; // "2026-03"
}) {
    try {
        const admin = await isAdminOrStaff();
        if (!admin) return { success: false, error: "Hanya admin yang dapat menjalankan penyusutan." };

        await assertCanAccessClient(data.clientId);

        // Parse period
        const [yearStr, monthStr] = data.period.split("-");
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);
        if (!year || !month || month < 1 || month > 12) {
            return { success: false, error: "Format periode tidak valid (YYYY-MM)." };
        }

        // Last day of the period month
        const periodDate = new Date(year, month, 0); // last day of month

        // Get all active fixed assets for this client
        const assets = await prisma.fixedAsset.findMany({
            where: { clientId: data.clientId },
            select: {
                id: true,
                name: true,
                costCurrent: true,
                depreciationRate: true,
                accumDeprecCurrent: true,
                bookValue: true,
            },
        });

        if (assets.length === 0) {
            return { success: false, error: "Tidak ada aset tetap untuk klien ini." };
        }

        // Calculate total monthly depreciation
        let totalDepreciation = 0;
        const details: { name: string; amount: number }[] = [];

        for (const asset of assets) {
            const cost = Number(asset.costCurrent);
            const rate = Number(asset.depreciationRate);
            const bookVal = Number(asset.bookValue);

            if (cost <= 0 || rate <= 0 || bookVal <= 0) continue;

            // Monthly depreciation = (cost * rate%) / 12
            let monthly = round2((cost * rate) / 12);

            // Don't depreciate below zero book value
            if (monthly > bookVal) {
                monthly = bookVal;
            }

            if (monthly > 0) {
                totalDepreciation += monthly;
                details.push({ name: asset.name, amount: monthly });
            }
        }

        if (totalDepreciation <= 0) {
            return { success: false, error: "Tidak ada penyusutan yang perlu dicatat (semua aset sudah habis disusutkan)." };
        }

        totalDepreciation = round2(totalDepreciation);

        // Create depreciation journal in a transaction
        const result = await prisma.$transaction(async (tx) => {
            const journalResult = await createDepreciationJournal(tx, {
                clientId: data.clientId,
                period: data.period,
                totalAmount: totalDepreciation,
                date: periodDate,
            });

            if (!journalResult.success) {
                throw new Error(journalResult.error || "Gagal membuat jurnal penyusutan.");
            }

            return journalResult;
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

        return {
            success: true,
            data: {
                period: data.period,
                totalDepreciation,
                assetsCount: details.length,
                details,
                journalRefNumber: result.refNumber,
            },
        };
    } catch (error) {
        log.error({ err: error }, "runMonthlyDepreciation failed");
        return handleAuthError(error);
    }
}
