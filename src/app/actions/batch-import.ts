"use server";

import { prisma } from "@/lib/prisma";
import { assertCanAccessClient, handleAuthError } from "@/lib/auth-helpers";
import { getCurrentUser } from "@/lib/auth-helpers";
import { ingestTemplateFile } from "@/lib/ingestion/template-ingestion";
import type { IngestionResult } from "@/lib/ingestion/template-ingestion";

// ── Single template upload ─────────────────────────────────────────────────

export async function importTemplateFile(
    fileBuffer: Buffer,
    clientId: string,
    fileName: string,
): Promise<{ success: boolean; data?: IngestionResult; error?: string }> {
    try {
        await assertCanAccessClient(clientId);
        const user = await getCurrentUser();
        const importedBy = user?.name || "Unknown";

        const result = await ingestTemplateFile(fileBuffer, clientId, fileName, importedBy);

        return { success: result.success, data: result, error: result.errors[0] };
    } catch (error) {
        console.error("[importTemplateFile]", error);
        return handleAuthError(error);
    }
}

// ── Batch upload (multiple files, auto-match clients) ──────────────────────

export interface BatchFileInput {
    fileName: string;
    fileBuffer: Buffer;
    clientId?: string; // if provided, skip auto-match
}

export interface BatchResult {
    success: boolean;
    results: (IngestionResult & { fileName: string })[];
    totalFiles: number;
    successCount: number;
    failCount: number;
}

export async function importBatchTemplates(
    files: BatchFileInput[],
): Promise<{ success: boolean; data?: BatchResult; error?: string }> {
    try {
        const user = await getCurrentUser();
        if (!user) return { success: false, error: "Sesi tidak valid." };

        const role = user.role.toLowerCase();
        if (role !== "admin" && role !== "staff") {
            return { success: false, error: "Batch upload hanya tersedia untuk admin/staff." };
        }

        const importedBy = user.name || "Unknown";

        // Load all clients for auto-matching by company name
        const clients = await prisma.client.findMany({
            select: { id: true, nama: true },
        });
        const clientNameMap = new Map<string, string>();
        for (const c of clients) {
            clientNameMap.set(c.nama.toUpperCase().trim(), c.id);
        }

        const results: (IngestionResult & { fileName: string })[] = [];
        let successCount = 0;
        let failCount = 0;

        for (const file of files) {
            let clientId = file.clientId;

            // Auto-match from filename pattern: "ClientName_Period.xlsx"
            if (!clientId) {
                const baseName = file.fileName.replace(/\.(xlsx?|csv)$/i, "");
                const namePart = baseName.split("_")[0]?.toUpperCase().trim();
                if (namePart) {
                    clientId = clientNameMap.get(namePart);
                    if (!clientId) {
                        // Fuzzy: check if any client name contains the filename prefix
                        for (const [cName, cId] of clientNameMap) {
                            if (cName.includes(namePart) || namePart.includes(cName)) {
                                clientId = cId;
                                break;
                            }
                        }
                    }
                }
            }

            if (!clientId) {
                results.push({
                    fileName: file.fileName,
                    success: false,
                    companyName: "",
                    period: "",
                    journalsCreated: 0,
                    assetsCreated: 0,
                    snapshotsCreated: 0,
                    skipped: 0,
                    warnings: [],
                    errors: [`Klien tidak ditemukan untuk file "${file.fileName}". Pastikan nama file sesuai format: NamaKlien_Periode.xlsx`],
                });
                failCount++;
                continue;
            }

            const result = await ingestTemplateFile(file.fileBuffer, clientId, file.fileName, importedBy);
            results.push({ ...result, fileName: file.fileName });

            if (result.success) successCount++;
            else failCount++;
        }

        return {
            success: true,
            data: {
                success: failCount === 0,
                results,
                totalFiles: files.length,
                successCount,
                failCount,
            },
        };
    } catch (error) {
        console.error("[importBatchTemplates]", error);
        return handleAuthError(error);
    }
}

// ── Import history (enhanced for templates) ────────────────────────────────

export async function getTemplateImportHistory(
    clientId?: string,
    page = 1,
    pageSize = 20,
): Promise<{
    success: boolean;
    data?: { batches: ImportBatchSummary[]; total: number; page: number; pageSize: number };
    error?: string;
}> {
    try {
        if (clientId) await assertCanAccessClient(clientId);

        const where = {
            ...(clientId ? { clientId } : {}),
            documentType: "TEMPLATE_EXCEL",
        };

        const [batches, total] = await Promise.all([
            prisma.importBatch.findMany({
                where,
                orderBy: { createdAt: "desc" },
                take: pageSize,
                skip: (page - 1) * pageSize,
                include: {
                    client: { select: { nama: true } },
                    _count: { select: { entries: true, fixedAssets: true } },
                },
            }),
            prisma.importBatch.count({ where }),
        ]);

        return {
            success: true,
            data: {
                batches: batches.map((b) => ({
                    id: b.id,
                    fileName: b.fileName,
                    clientName: b.client.nama,
                    companyName: b.companyName,
                    period: b.period,
                    status: b.status,
                    entriesCount: b._count.entries,
                    assetsCount: b._count.fixedAssets,
                    skippedCount: b.skippedCount,
                    errorsCount: b.errorsCount,
                    warnings: b.warnings as string[] | null,
                    importedBy: b.importedBy,
                    createdAt: b.createdAt.toISOString(),
                    completedAt: b.completedAt?.toISOString() || null,
                })),
                total,
                page,
                pageSize,
            },
        };
    } catch (error) {
        console.error("[getTemplateImportHistory]", error);
        return handleAuthError(error);
    }
}

export interface ImportBatchSummary {
    id: string;
    fileName: string;
    clientName: string;
    companyName: string | null;
    period: string | null;
    status: string;
    entriesCount: number;
    assetsCount: number;
    skippedCount: number;
    errorsCount: number;
    warnings: string[] | null;
    importedBy: string;
    createdAt: string;
    completedAt: string | null;
}

// ── Rollback template import ───────────────────────────────────────────────

export async function rollbackTemplateImport(
    batchId: string,
): Promise<{ success: boolean; error?: string }> {
    try {
        const batch = await prisma.importBatch.findUnique({
            where: { id: batchId },
            select: { clientId: true, status: true },
        });

        if (!batch) return { success: false, error: "Batch tidak ditemukan." };
        if (batch.status === "ROLLED_BACK") return { success: false, error: "Batch sudah di-rollback." };

        await assertCanAccessClient(batch.clientId);

        await prisma.$transaction(async (tx) => {
            // Delete journal entries (cascades to journal items)
            await tx.journalEntry.deleteMany({ where: { importBatchId: batchId } });

            // Delete fixed assets
            await tx.fixedAsset.deleteMany({ where: { importBatchId: batchId } });

            // Mark batch as rolled back
            await tx.importBatch.update({
                where: { id: batchId },
                data: { status: "ROLLED_BACK" },
            });
        });

        return { success: true };
    } catch (error) {
        console.error("[rollbackTemplateImport]", error);
        return handleAuthError(error);
    }
}
