/**
 * Template Ingestion Orchestrator
 *
 * Reads a standardized Excel template (10 sheets), extracts client identity,
 * reads account mappings, parses all data sheets, and persists results
 * (JournalEntries, FixedAssets, FinancialReportSnapshots) in a single transaction.
 */

import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { readMappingSheet } from "./mapping-reader";
import { extractPeriod } from "./number-parser";
import {
    parseLaporanPenjualan,
    parsePiutangLainLain,
    parseAsetTetap,
    parseBiayaPraOperasi,
    parseHutangUsaha,
    parseHutangOwner,
    parseLabaRugi,
    parseArusKas,
} from "./sheet-parsers";
import type { JournalEntryData, FixedAssetData, FinancialLineItem } from "./sheet-parsers";

// ── Types ──────────────────────────────────────────────────────────────────

export interface IngestionResult {
    success: boolean;
    batchId?: string;
    companyName: string;
    period: string;
    journalsCreated: number;
    assetsCreated: number;
    snapshotsCreated: number;
    skipped: number;
    warnings: string[];
    errors: string[];
}

/** Expected sheet name → parser key mapping */
const SHEET_KEYS = [
    "1_LAPORAN_PENJUALAN",
    "2_PIUTANG_LAIN_LAIN",
    "3_ASET_MANAJEMEN",
    "4_ASET_OWNER",
    "5_BIAYA_PRA_OPERASI",
    "6_HUTANG_USAHA",
    "7_HUTANG_OWNER",
    "8_LABA_RUGI",
    "9_ARUS_KAS",
    "10_MAPPING_AKUN",
] as const;

// ── Main entry point ───────────────────────────────────────────────────────

/**
 * Ingest a standardized Excel template file for a given client.
 *
 * @param fileBuffer - The Excel file as a Buffer (from upload)
 * @param clientId - The client ID in the database
 * @param fileName - Original file name (for audit trail)
 * @param importedBy - Display name of the uploader
 */
export async function ingestTemplateFile(
    fileBuffer: Buffer,
    clientId: string,
    fileName: string,
    importedBy: string,
): Promise<IngestionResult> {
    const warnings: string[] = [];
    const errors: string[] = [];

    // 1. Parse workbook
    let workbook: XLSX.WorkBook;
    try {
        workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: false });
    } catch {
        return fail("Gagal membaca file Excel. Pastikan format .xlsx/.xls.");
    }

    // 2. Validate required sheets exist
    const sheetNames = workbook.SheetNames.map((s) => s.toUpperCase().trim());
    const missing = SHEET_KEYS.slice(0, 9).filter(
        (key) => !sheetNames.some((s) => s.includes(key) || s.includes(key.split("_").slice(1).join("_")))
    );
    if (missing.length > 3) {
        return fail(`Template tidak valid. Sheet yang hilang: ${missing.join(", ")}`);
    }
    if (missing.length > 0) {
        warnings.push(`Sheet tidak ditemukan (dilewati): ${missing.join(", ")}`);
    }

    // 3. Extract company name from cell B2 of any data sheet
    const companyName = extractCompanyName(workbook);

    // 4. Extract period from cell B3 or sheet metadata
    const period = extractFilePeriod(workbook);

    // 5. Read account mappings from sheet 10
    const mappings = readMappingSheet(workbook);

    // 6. Parse each sheet
    const allEntries: JournalEntryData[] = [];
    const allAssets: FixedAssetData[] = [];
    let labaRugiData: FinancialLineItem[] = [];
    let arusKasData: FinancialLineItem[] = [];

    const ws = (name: string) => findSheet(workbook, name);

    // Sheet 1: Laporan Penjualan
    const s1 = ws("1_LAPORAN_PENJUALAN");
    if (s1) {
        const r = parseLaporanPenjualan(s1, mappings["1_LAPORAN_PENJUALAN"] || [], clientId);
        allEntries.push(...r.entries);
        warnings.push(...r.warnings);
        errors.push(...r.errors);
    }

    // Sheet 2: Piutang Lain Lain
    const s2 = ws("2_PIUTANG_LAIN_LAIN");
    if (s2) {
        const r = parsePiutangLainLain(s2);
        allEntries.push(...r.entries);
        warnings.push(...r.warnings);
    }

    // Sheet 3: Aset Manajemen
    const s3 = ws("3_ASET_MANAJEMEN");
    if (s3) {
        const r = parseAsetTetap(s3, "ASET_MANAJEMEN", mappings["3_ASET_MANAJEMEN"] || []);
        allEntries.push(...r.entries);
        allAssets.push(...r.assets);
        warnings.push(...r.warnings);
    }

    // Sheet 4: Aset Owner
    const s4 = ws("4_ASET_OWNER");
    if (s4) {
        const r = parseAsetTetap(s4, "ASET_OWNER", mappings["4_ASET_OWNER"] || []);
        allEntries.push(...r.entries);
        allAssets.push(...r.assets);
        warnings.push(...r.warnings);
    }

    // Sheet 5: Biaya Pra Operasi
    const s5 = ws("5_BIAYA_PRA_OPERASI");
    if (s5) {
        const r = parseBiayaPraOperasi(s5);
        allEntries.push(...r.entries);
        allAssets.push(...r.assets);
        warnings.push(...r.warnings);
    }

    // Sheet 6: Hutang Usaha
    const s6 = ws("6_HUTANG_USAHA");
    if (s6) {
        const r = parseHutangUsaha(s6);
        allEntries.push(...r.entries);
        warnings.push(...r.warnings);
    }

    // Sheet 7: Hutang Owner
    const s7 = ws("7_HUTANG_OWNER");
    if (s7) {
        const r = parseHutangOwner(s7);
        allEntries.push(...r.entries);
        warnings.push(...r.warnings);
    }

    // Sheet 8: Laba Rugi
    const s8 = ws("8_LABA_RUGI");
    if (s8) {
        const r = parseLabaRugi(s8);
        labaRugiData = r.financialData;
        warnings.push(...r.warnings);
    }

    // Sheet 9: Arus Kas
    const s9 = ws("9_ARUS_KAS");
    if (s9) {
        const r = parseArusKas(s9);
        arusKasData = r.financialData;
        warnings.push(...r.warnings);
    }

    if (allEntries.length === 0 && allAssets.length === 0 && labaRugiData.length === 0 && arusKasData.length === 0) {
        return fail("Tidak ada data yang dapat diproses dari template.");
    }

    // 7. Load account code → ID lookup
    const accounts = await prisma.account.findMany({
        where: {
            OR: [{ clientId: null }, { clientId }],
            isActive: true,
        },
        select: { id: true, code: true },
    });
    const accountMap = new Map<string, string>();
    for (const acc of accounts) {
        // Prefer client-specific over shared
        if (!accountMap.has(acc.code) || acc.code) {
            accountMap.set(acc.code, acc.id);
        }
    }

    // Verify required codes exist
    const allCodes = new Set<string>();
    for (const e of allEntries) {
        for (const item of e.items) {
            if (item.accountCode !== "—") allCodes.add(item.accountCode);
        }
    }
    const missingCodes = [...allCodes].filter((c) => !accountMap.has(c));
    if (missingCodes.length > 0) {
        warnings.push(`Kode akun tidak ditemukan: ${missingCodes.join(", ")}. Baris terkait dilewati.`);
    }

    // 8. Persist everything in a transaction
    let batchId = "";
    let journalsCreated = 0;
    let assetsCreated = 0;
    let snapshotsCreated = 0;
    let skipped = 0;

    try {
        await prisma.$transaction(async (tx) => {
            // Create import batch record
            const batch = await tx.importBatch.create({
                data: {
                    fileName,
                    documentType: "TEMPLATE_EXCEL",
                    period,
                    companyName,
                    status: "PROCESSING",
                    importedBy,
                    clientId,
                },
            });
            batchId = batch.id;

            // ── Journal Entries ─────────────────────────────────────────
            for (const entry of allEntries) {
                // Filter items to those with valid accounts
                const validItems = entry.items.filter(
                    (i) => i.accountCode !== "—" && accountMap.has(i.accountCode) && (i.debit > 0 || i.credit > 0)
                );
                if (validItems.length < 2) {
                    skipped++;
                    continue;
                }

                // Generate ref number atomically
                const dateStr = entry.date.toISOString().slice(0, 7).replace("-", "");
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
                const refNumber = entry.refNumber || `JV-${dateStr}-${seq.toString().padStart(4, "0")}`;

                await tx.journalEntry.create({
                    data: {
                        refNumber,
                        date: entry.date,
                        description: entry.description,
                        status: "Draft",
                        clientId,
                        totalDebit: entry.totalDebit,
                        totalCredit: entry.totalCredit,
                        source: entry.source,
                        importBatchId: batchId,
                        items: {
                            create: validItems.map((i) => ({
                                accountId: accountMap.get(i.accountCode)!,
                                debit: i.debit,
                                credit: i.credit,
                            })),
                        },
                    },
                });
                journalsCreated++;
            }

            // ── Fixed Assets ────────────────────────────────────────────
            if (allAssets.length > 0) {
                await tx.fixedAsset.createMany({
                    data: allAssets.map((a) => ({
                        clientId,
                        importBatchId: batchId,
                        source: a.source,
                        name: a.name,
                        acquisitionDate: a.acquisitionDate,
                        quantity: a.quantity,
                        depreciationRate: a.depreciationRate,
                        costPrev: a.costPrev,
                        mutasiIn: a.mutasiIn,
                        mutasiOut: a.mutasiOut,
                        costCurrent: a.costCurrent,
                        accumDeprecPrev: a.accumDeprecPrev,
                        deprecCurrentIn: a.deprecCurrentIn,
                        deprecCurrentOut: a.deprecCurrentOut,
                        accumDeprecCurrent: a.accumDeprecCurrent,
                        bookValue: a.bookValue,
                    })),
                });
                assetsCreated = allAssets.length;
            }

            // ── Financial Report Snapshots ──────────────────────────────
            if (labaRugiData.length > 0) {
                await tx.financialReportSnapshot.upsert({
                    where: {
                        clientId_period_reportType: {
                            clientId,
                            period: period || "unknown",
                            reportType: "LABA_RUGI",
                        },
                    },
                    create: {
                        clientId,
                        period: period || "unknown",
                        reportType: "LABA_RUGI",
                        data: labaRugiData as unknown as Prisma.JsonArray,
                    },
                    update: {
                        data: labaRugiData as unknown as Prisma.JsonArray,
                    },
                });
                snapshotsCreated++;
            }

            if (arusKasData.length > 0) {
                await tx.financialReportSnapshot.upsert({
                    where: {
                        clientId_period_reportType: {
                            clientId,
                            period: period || "unknown",
                            reportType: "ARUS_KAS",
                        },
                    },
                    create: {
                        clientId,
                        period: period || "unknown",
                        reportType: "ARUS_KAS",
                        data: arusKasData as unknown as Prisma.JsonArray,
                    },
                    update: {
                        data: arusKasData as unknown as Prisma.JsonArray,
                    },
                });
                snapshotsCreated++;
            }

            // ── Finalize batch ──────────────────────────────────────────
            await tx.importBatch.update({
                where: { id: batchId },
                data: {
                    status: "COMPLETED",
                    entriesCount: journalsCreated,
                    skippedCount: skipped,
                    errorsCount: errors.length,
                    warnings: warnings.length > 0 ? warnings : undefined,
                    completedAt: new Date(),
                },
            });
        }, { timeout: 60_000 }); // 60s timeout for large templates
    } catch (err) {
        console.error("[ingestTemplateFile] Transaction failed:", err);
        return {
            success: false,
            companyName,
            period,
            journalsCreated: 0,
            assetsCreated: 0,
            snapshotsCreated: 0,
            skipped: 0,
            warnings,
            errors: [...errors, "Gagal menyimpan data. Silakan coba lagi."],
        };
    }

    return {
        success: true,
        batchId,
        companyName,
        period,
        journalsCreated,
        assetsCreated,
        snapshotsCreated,
        skipped,
        warnings,
        errors,
    };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fail(msg: string): IngestionResult {
    return {
        success: false,
        companyName: "",
        period: "",
        journalsCreated: 0,
        assetsCreated: 0,
        snapshotsCreated: 0,
        skipped: 0,
        warnings: [],
        errors: [msg],
    };
}

/**
 * Find a worksheet by partial name match.
 * E.g., "1_LAPORAN_PENJUALAN" matches "1_LAPORAN_PENJUALAN", "1_Laporan_Penjualan", etc.
 */
function findSheet(wb: XLSX.WorkBook, key: string): XLSX.WorkSheet | null {
    const keyUp = key.toUpperCase();
    // Try exact match first
    const exact = wb.SheetNames.find((s) => s.toUpperCase().trim() === keyUp);
    if (exact) return wb.Sheets[exact];

    // Try partial match (the numeric prefix + main keyword)
    const parts = keyUp.split("_");
    const prefix = parts[0]; // "1", "2", etc.
    const keyword = parts.slice(1).join("_"); // "LAPORAN_PENJUALAN"

    const partial = wb.SheetNames.find((s) => {
        const up = s.toUpperCase().trim();
        return up.startsWith(prefix + "_") && up.includes(keyword);
    });
    if (partial) return wb.Sheets[partial];

    // Try just the keyword
    const byKeyword = wb.SheetNames.find((s) =>
        s.toUpperCase().trim().includes(keyword)
    );
    if (byKeyword) return wb.Sheets[byKeyword];

    return null;
}

/**
 * Extract company name from cell B2 of the first data sheet.
 */
function extractCompanyName(wb: XLSX.WorkBook): string {
    for (const name of wb.SheetNames) {
        const ws = wb.Sheets[name];
        const b2 = ws?.B2;
        if (b2?.v) {
            const val = String(b2.v).trim();
            if (val.length > 2 && val.length < 200) return val;
        }
    }
    return "";
}

/**
 * Extract period from cell B3 of the first data sheet, or from filename conventions.
 */
function extractFilePeriod(wb: XLSX.WorkBook): string {
    for (const name of wb.SheetNames) {
        const ws = wb.Sheets[name];
        const b3 = ws?.B3;
        if (b3?.v) {
            const val = extractPeriod(b3.v);
            if (val.length > 2) return val;
        }
    }
    return "";
}
