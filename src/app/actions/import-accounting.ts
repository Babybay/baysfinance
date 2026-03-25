"use server";

import { prisma } from "@/lib/prisma";
import { JournalStatus, Prisma } from "@prisma/client";
import { validateJournalBalance } from "@/lib/accounting-helpers";
import { assertCanAccessClient, handleAuthError } from "@/lib/auth-helpers";
import { getCurrentUser } from "@/lib/auth-helpers";
import type { DocumentType } from "@/lib/document-detector";
import type { GeneratedEntry } from "@/lib/journal-generator";
import { SOURCE_LABELS } from "@/lib/journal-generator";

// ── Import entries ──────────────────────────────────────────────────────────

export async function importDocumentEntries(
    entries: GeneratedEntry[],
    clientId: string,
    docType: DocumentType,
    fileName: string,
): Promise<{
    success: boolean;
    imported: number;
    skipped: number;
    errors: string[];
    batchId?: string;
}> {
    try {
        await assertCanAccessClient(clientId);

        const user = await getCurrentUser();
        const importedBy = user?.name || "Unknown";

        if (!entries || entries.length === 0) {
            return { success: false, imported: 0, skipped: 0, errors: ["Tidak ada data untuk diimpor."] };
        }

        // 1. Load account lookup for this client
        const accounts = await prisma.account.findMany({
            where: {
                OR: [{ clientId: null }, { clientId }],
                isActive: true,
            },
            select: { id: true, code: true },
        });

        const accountMap = new Map<string, string>();
        for (const acc of accounts) {
            accountMap.set(acc.code, acc.id);
        }

        // Verify all required account codes exist
        const allCodes = new Set<string>();
        for (const entry of entries) {
            for (const item of entry.items) {
                allCodes.add(item.accountCode);
            }
        }

        const missingCodes = [...allCodes].filter((code) => !accountMap.has(code));
        if (missingCodes.length > 0) {
            return {
                success: false,
                imported: 0,
                skipped: 0,
                errors: [`Akun berikut belum ada di Chart of Accounts: ${missingCodes.join(", ")}. Jalankan seed akun terlebih dahulu.`],
            };
        }

        // 2. Check for existing imports (duplicate protection by date + source)
        const source = SOURCE_LABELS[docType] || docType;
        const dates = entries.map((e) => e.date);
        const uniqueDates = [...new Set(dates)];

        const existingEntries = await prisma.journalEntry.findMany({
            where: {
                clientId,
                source,
                date: { in: uniqueDates.map((d) => new Date(d)) },
                deletedAt: null,
            },
            select: { date: true },
        });

        const existingDates = new Set(
            existingEntries.map((e) => e.date.toISOString().slice(0, 10))
        );

        // 3. Split into importable vs skipped
        const toImport = entries.filter((e) => !existingDates.has(e.date));
        const skippedCount = entries.length - toImport.length;
        const errors: string[] = [];

        if (toImport.length === 0) {
            return {
                success: true,
                imported: 0,
                skipped: skippedCount,
                errors: ["Semua tanggal sudah pernah diimpor sebelumnya."],
            };
        }

        // 4. Validate all entries
        const validEntries: GeneratedEntry[] = [];
        for (const entry of toImport) {
            const items = entry.items.map((i) => ({
                accountId: accountMap.get(i.accountCode) || "",
                debit: i.debit,
                credit: i.credit,
            }));

            if (items.some((i) => !i.accountId)) {
                errors.push(`${entry.date}: Akun tidak ditemukan.`);
                continue;
            }

            if (items.length < 2) {
                errors.push(`${entry.date}: Data tidak cukup untuk membuat jurnal.`);
                continue;
            }

            const validation = validateJournalBalance(items);
            if (!validation.isValid) {
                errors.push(`${entry.date}: ${validation.error}`);
                continue;
            }

            validEntries.push(entry);
        }

        if (validEntries.length === 0) {
            return { success: false, imported: 0, skipped: skippedCount, errors };
        }

        // 5. Insert atomically in a single transaction
        let importedCount = 0;
        let batchId = "";

        await prisma.$transaction(async (tx) => {
            // Create import batch record
            const batch = await tx.importBatch.create({
                data: {
                    fileName,
                    documentType: docType,
                    entriesCount: validEntries.length,
                    skippedCount: skippedCount + (toImport.length - validEntries.length),
                    errorsCount: errors.length,
                    importedBy,
                    clientId,
                },
            });
            batchId = batch.id;

            for (const entry of validEntries) {
                // Generate ref number atomically (L2 pattern)
                const entryDate = new Date(entry.date);
                const dateStr = entryDate.toISOString().slice(0, 7).replace("-", "");
                const counterKey = `JV-${dateStr}`;

                const rows = await tx.$queryRaw<[{ counter: number }]>(
                    Prisma.sql`
                        INSERT INTO permit_counters (id, counter)
                        VALUES (${counterKey}, 1)
                        ON CONFLICT (id) DO UPDATE
                            SET counter = permit_counters.counter + 1
                        RETURNING counter
                    `
                );
                const seq = rows[0].counter;
                const refNumber = `JV-${dateStr}-${seq.toString().padStart(4, "0")}`;

                const items = entry.items
                    .filter((i) => i.debit > 0 || i.credit > 0)
                    .map((i) => ({
                        accountId: accountMap.get(i.accountCode)!,
                        debit: i.debit,
                        credit: i.credit,
                    }));

                await tx.journalEntry.create({
                    data: {
                        refNumber,
                        date: entryDate,
                        description: entry.description,
                        status: JournalStatus.Posted,
                        clientId,
                        totalDebit: entry.totalDebit,
                        totalCredit: entry.totalCredit,
                        source,
                        importBatchId: batch.id,
                        items: { create: items },
                    },
                });

                importedCount++;
            }
        });

        return {
            success: true,
            imported: importedCount,
            skipped: skippedCount + (toImport.length - validEntries.length),
            errors,
            batchId,
        };
    } catch (error) {
        console.error("[importDocumentEntries]", error);
        return {
            ...handleAuthError(error),
            imported: 0,
            skipped: 0,
            errors: ["Terjadi kesalahan saat mengimpor data."],
        };
    }
}

// ── Import history ──────────────────────────────────────────────────────────

export async function getImportHistory(
    clientId: string,
    page = 1,
    pageSize = 20,
): Promise<{
    success: boolean;
    data: {
        id: string;
        fileName: string;
        documentType: string;
        entriesCount: number;
        skippedCount: number;
        errorsCount: number;
        importedBy: string;
        createdAt: Date;
    }[];
    total: number;
    error?: string;
}> {
    try {
        await assertCanAccessClient(clientId);

        // Clamp pagination bounds
        page = Math.max(1, Math.floor(page));
        pageSize = Math.min(Math.max(1, Math.floor(pageSize)), 100);

        const skip = (page - 1) * pageSize;

        const [batches, total] = await prisma.$transaction([
            prisma.importBatch.findMany({
                where: { clientId },
                orderBy: { createdAt: "desc" },
                skip,
                take: pageSize,
            }),
            prisma.importBatch.count({ where: { clientId } }),
        ]);

        return {
            success: true,
            data: batches.map((b) => ({
                id: b.id,
                fileName: b.fileName,
                documentType: b.documentType,
                entriesCount: b.entriesCount,
                skippedCount: b.skippedCount,
                errorsCount: b.errorsCount,
                importedBy: b.importedBy,
                createdAt: b.createdAt,
            })),
            total,
        };
    } catch (error) {
        console.error("[getImportHistory]", error);
        return { ...handleAuthError(error), data: [], total: 0 };
    }
}

// ── Rollback import batch ───────────────────────────────────────────────────

export async function rollbackImportBatch(
    batchId: string,
    clientId: string,
): Promise<{ success: boolean; deleted: number; error?: string }> {
    try {
        await assertCanAccessClient(clientId);

        // Verify batch belongs to this client
        const batch = await prisma.importBatch.findFirst({
            where: { id: batchId, clientId },
        });

        if (!batch) {
            return { success: false, deleted: 0, error: "Batch import tidak ditemukan." };
        }

        // Soft-delete all journal entries in this batch
        const result = await prisma.journalEntry.updateMany({
            where: { importBatchId: batchId, clientId, deletedAt: null },
            data: { deletedAt: new Date() },
        });

        // Soft-delete the batch itself
        await prisma.importBatch.update({
            where: { id: batchId },
            data: { deletedAt: new Date() },
        });

        return { success: true, deleted: result.count };
    } catch (error) {
        console.error("[rollbackImportBatch]", error);
        return { ...handleAuthError(error), deleted: 0 };
    }
}
