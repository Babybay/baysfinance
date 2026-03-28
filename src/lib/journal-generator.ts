/**
 * Journal Entry Generator
 *
 * Converts parsed document rows into journal entry items for each document type.
 * Each function returns debit/credit items that balance for double-entry bookkeeping.
 */

import type { DocumentType } from "./document-detector";
import type { ParsedDocRow } from "./document-parser";
import type { ColumnMapping } from "./import-helpers";
import { getAccountMappings } from "./column-mapper";
import { PPH_RATES, STANDARD_ACCOUNTS } from "./tax-config";

export interface GeneratedEntry {
    date: string; // ISO YYYY-MM-DD
    description: string;
    items: { accountCode: string; accountName: string; debit: number; credit: number }[];
    totalDebit: number;
    totalCredit: number;
    balanced: boolean;
    sourceRow: number;
}

export interface GenerationResult {
    entries: GeneratedEntry[];
    errors: string[];
    warnings: string[];
}

// ── Generic helper ──────────────────────────────────────────────────────────

function buildItemsFromMappings(
    row: ParsedDocRow,
    mappings: ColumnMapping[],
): { accountCode: string; accountName: string; debit: number; credit: number }[] {
    const items: { accountCode: string; accountName: string; debit: number; credit: number }[] = [];

    for (const mapping of mappings) {
        const canonical = mapping.column;
        const amount = typeof row.values[canonical] === "number" ? row.values[canonical] as number : 0;
        if (amount === 0) continue;

        // Merge into existing item for same account + side
        const existing = items.find(
            (i) => i.accountCode === mapping.accountCode &&
                ((mapping.side === "debit" && i.debit > 0) || (mapping.side === "credit" && i.credit > 0))
        );

        if (existing) {
            if (mapping.side === "debit") existing.debit += amount;
            else existing.credit += amount;
        } else {
            items.push({
                accountCode: mapping.accountCode,
                accountName: mapping.accountName,
                debit: mapping.side === "debit" ? amount : 0,
                credit: mapping.side === "credit" ? amount : 0,
            });
        }
    }

    return items;
}

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

// ── Type-specific generators ────────────────────────────────────────────────

function generateFromCashierReport(rows: ParsedDocRow[]): GenerationResult {
    const mappings = getAccountMappings("cashier_report");
    return generateGeneric(rows, mappings, "cashier_report");
}

function generateFromBankStatement(rows: ParsedDocRow[]): GenerationResult {
    const entries: GeneratedEntry[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    // Bank statement: each row is a transaction
    // Debit (withdrawal) → expense debit, bank credit
    // Credit (deposit) → bank debit, revenue credit
    for (const row of rows) {
        if (!row.date) continue;

        const debitAmt = typeof row.values["DEBIT"] === "number" ? row.values["DEBIT"] as number : 0;
        const creditAmt = typeof row.values["KREDIT"] === "number" ? row.values["KREDIT"] as number : 0;
        const keterangan = String(row.values["KETERANGAN"] || "Transaksi Bank");

        if (debitAmt === 0 && creditAmt === 0) continue;

        const items: GeneratedEntry["items"] = [];

        if (debitAmt > 0) {
            // Bank withdrawal: expense goes up, bank goes down
            items.push({ accountCode: "729", accountName: "Lainnya/Others", debit: debitAmt, credit: 0 });
            items.push({ accountCode: "111", accountName: "Bank BNI Giro", debit: 0, credit: debitAmt });
        }

        if (creditAmt > 0) {
            // Bank deposit: bank goes up, revenue goes up
            items.push({ accountCode: "111", accountName: "Bank BNI Giro", debit: creditAmt, credit: 0 });
            items.push({ accountCode: "902", accountName: "Pendapatan Lainnya", debit: 0, credit: creditAmt });
        }

        const totalDebit = round2(items.reduce((s, i) => s + i.debit, 0));
        const totalCredit = round2(items.reduce((s, i) => s + i.credit, 0));

        entries.push({
            date: row.date,
            description: `Bank: ${keterangan}`,
            items,
            totalDebit,
            totalCredit,
            balanced: Math.abs(totalDebit - totalCredit) < 0.01,
            sourceRow: row.rowNumber,
        });
    }

    return { entries, errors, warnings };
}

function generateFromInvoice(rows: ParsedDocRow[]): GenerationResult {
    const entries: GeneratedEntry[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const row of rows) {
        if (!row.date) continue;

        const dpp = typeof row.values["DPP"] === "number" ? row.values["DPP"] as number : 0;
        const ppn = typeof row.values["PPN"] === "number" ? row.values["PPN"] as number : 0;
        const total = typeof row.values["TOTAL"] === "number" ? row.values["TOTAL"] as number : 0;
        const vendor = String(row.values["VENDOR"] || row.values["CUSTOMER"] || "");
        const noInv = String(row.values["NO INVOICE"] || "");

        const amount = total || (dpp + ppn);
        if (amount === 0) {
            warnings.push(`Baris ${row.rowNumber}: Total invoice = 0, dilewati.`);
            continue;
        }

        const items: GeneratedEntry["items"] = [];

        // Purchase invoice: expense debit, utang usaha credit
        if (dpp > 0) {
            items.push({ accountCode: "729", accountName: "Lainnya/Others (Pembelian)", debit: dpp, credit: 0 });
        }
        if (ppn > 0) {
            items.push({ accountCode: "320", accountName: "PB 1/PHR (PPN Masukan)", debit: ppn, credit: 0 });
        }
        items.push({ accountCode: "300", accountName: "Utang Usaha", debit: 0, credit: dpp + ppn || amount });

        // If we only have total (no DPP breakdown), use total as debit
        if (dpp === 0 && ppn === 0 && total > 0) {
            items.length = 0; // reset
            items.push({ accountCode: "729", accountName: "Lainnya/Others (Pembelian)", debit: total, credit: 0 });
            items.push({ accountCode: "300", accountName: "Utang Usaha", debit: 0, credit: total });
        }

        const totalDebit = round2(items.reduce((s, i) => s + i.debit, 0));
        const totalCredit = round2(items.reduce((s, i) => s + i.credit, 0));

        const desc = [noInv, vendor].filter(Boolean).join(" — ") || `Invoice ${row.date}`;

        entries.push({
            date: row.date,
            description: `Invoice: ${desc}`,
            items,
            totalDebit,
            totalCredit,
            balanced: Math.abs(totalDebit - totalCredit) < 0.01,
            sourceRow: row.rowNumber,
        });
    }

    return { entries, errors, warnings };
}

function generateFromPurchaseOrder(rows: ParsedDocRow[]): GenerationResult {
    const entries: GeneratedEntry[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const row of rows) {
        if (!row.date) continue;

        const total = typeof row.values["TOTAL"] === "number" ? row.values["TOTAL"] as number : 0;
        const supplier = String(row.values["SUPPLIER"] || "");
        const noPO = String(row.values["NO PO"] || "");

        if (total === 0) continue;

        const items: GeneratedEntry["items"] = [
            { accountCode: "130", accountName: "Inv - Food Inventory (PO)", debit: total, credit: 0 },
            { accountCode: "300", accountName: "Utang Usaha", debit: 0, credit: total },
        ];

        const desc = [noPO, supplier].filter(Boolean).join(" — ") || `PO ${row.date}`;

        entries.push({
            date: row.date,
            description: `PO: ${desc}`,
            items,
            totalDebit: total,
            totalCredit: total,
            balanced: true,
            sourceRow: row.rowNumber,
        });
    }

    return { entries, errors, warnings };
}

function generateFromExpenseReport(rows: ParsedDocRow[]): GenerationResult {
    const entries: GeneratedEntry[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    // Group expenses by date
    const byDate = new Map<string, ParsedDocRow[]>();
    for (const row of rows) {
        if (!row.date) continue;
        const existing = byDate.get(row.date) || [];
        existing.push(row);
        byDate.set(row.date, existing);
    }

    for (const [date, dateRows] of byDate) {
        const items: GeneratedEntry["items"] = [];
        let totalAmount = 0;

        for (const row of dateRows) {
            const amount = typeof row.values["JUMLAH"] === "number" ? row.values["JUMLAH"] as number : 0;
            if (amount === 0) continue;

            const kategori = String(row.values["KATEGORI"] || "Beban Lainnya");
            items.push({ accountCode: "729", accountName: `Lainnya/Others (${kategori})`, debit: amount, credit: 0 });
            totalAmount += amount;
        }

        if (totalAmount === 0) continue;

        // Credit: Petty Cash or Bank
        items.push({ accountCode: "100", accountName: "Petty Cash", debit: 0, credit: round2(totalAmount) });

        const totalDebit = round2(items.reduce((s, i) => s + i.debit, 0));
        const totalCredit = round2(items.reduce((s, i) => s + i.credit, 0));

        entries.push({
            date,
            description: `Pengeluaran — ${date}`,
            items,
            totalDebit,
            totalCredit,
            balanced: Math.abs(totalDebit - totalCredit) < 0.01,
            sourceRow: dateRows[0].rowNumber,
        });
    }

    return { entries, errors, warnings };
}

function generateFromPayroll(rows: ParsedDocRow[]): GenerationResult {
    const entries: GeneratedEntry[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    // Payroll: aggregate all employees into one journal entry per batch
    let totalGaji = 0;
    let totalTunjangan = 0;
    let totalLembur = 0;
    let totalBPJS = 0;
    let totalPPh = 0;
    let totalNet = 0;

    for (const row of rows) {
        totalGaji += typeof row.values["GAJI POKOK"] === "number" ? row.values["GAJI POKOK"] as number : 0;
        totalTunjangan += typeof row.values["TUNJANGAN"] === "number" ? row.values["TUNJANGAN"] as number : 0;
        totalLembur += typeof row.values["LEMBUR"] === "number" ? row.values["LEMBUR"] as number : 0;
        totalBPJS += typeof row.values["BPJS"] === "number" ? row.values["BPJS"] as number : 0;
        totalPPh += typeof row.values["PPH 21"] === "number" ? row.values["PPH 21"] as number : 0;
        totalNet += typeof row.values["TOTAL"] === "number" ? row.values["TOTAL"] as number : 0;
    }

    const grossTotal = round2(totalGaji + totalTunjangan + totalLembur);
    if (grossTotal === 0) {
        errors.push("Total gaji = 0. Tidak ada data gaji untuk diimpor.");
        return { entries, errors, warnings };
    }

    const items: GeneratedEntry["items"] = [];

    // Debit: salary expenses
    if (totalGaji > 0) items.push({ accountCode: "700", accountName: "Gaji dan Upah", debit: round2(totalGaji), credit: 0 });
    if (totalTunjangan > 0) items.push({ accountCode: "701", accountName: "Tunjangan Hari Raya", debit: round2(totalTunjangan), credit: 0 });
    if (totalLembur > 0) items.push({ accountCode: "700", accountName: "Gaji dan Upah (Lembur)", debit: round2(totalLembur), credit: 0 });

    // Credit: deductions
    if (totalBPJS > 0) items.push({ accountCode: "310", accountName: "Utang Lain Lain (BPJS)", debit: 0, credit: round2(totalBPJS) });
    if (totalPPh > 0) items.push({ accountCode: PPH_RATES.PPh21.accountCode, accountName: "Pajak Badan (PPh 21)", debit: 0, credit: round2(totalPPh) });

    // Net payable
    const netPayable = totalNet || round2(grossTotal - totalBPJS - totalPPh);
    if (netPayable > 0) items.push({ accountCode: "300", accountName: "Utang Usaha (Gaji)", debit: 0, credit: round2(netPayable) });

    const totalDebit = round2(items.reduce((s, i) => s + i.debit, 0));
    const totalCredit = round2(items.reduce((s, i) => s + i.credit, 0));

    // Use today's date or the first row's date
    const date = rows[0]?.date || new Date().toISOString().slice(0, 10);

    entries.push({
        date,
        description: `Payroll — ${rows.length} karyawan`,
        items,
        totalDebit,
        totalCredit,
        balanced: Math.abs(totalDebit - totalCredit) < 0.01,
        sourceRow: rows[0]?.rowNumber || 0,
    });

    if (!entries[0].balanced) {
        warnings.push(`Selisih debit/kredit: ${Math.abs(totalDebit - totalCredit).toFixed(2)}. Periksa kolom potongan.`);
    }

    return { entries, errors, warnings };
}

function generateFromPettyCash(rows: ParsedDocRow[]): GenerationResult {
    const entries: GeneratedEntry[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const row of rows) {
        if (!row.date) continue;

        const masuk = typeof row.values["MASUK"] === "number" ? row.values["MASUK"] as number : 0;
        const keluar = typeof row.values["KELUAR"] === "number" ? row.values["KELUAR"] as number : 0;
        const keterangan = String(row.values["KETERANGAN"] || "Kas Kecil");

        if (masuk === 0 && keluar === 0) continue;

        const items: GeneratedEntry["items"] = [];

        if (masuk > 0) {
            // Cash in: petty cash debit, bank credit (replenishment)
            items.push({ accountCode: "100", accountName: "Petty Cash", debit: masuk, credit: 0 });
            items.push({ accountCode: "111", accountName: "Bank BNI Giro", debit: 0, credit: masuk });
        }

        if (keluar > 0) {
            // Cash out: expense debit, petty cash credit
            items.push({ accountCode: "729", accountName: "Lainnya/Others", debit: keluar, credit: 0 });
            items.push({ accountCode: "100", accountName: "Petty Cash", debit: 0, credit: keluar });
        }

        const totalDebit = round2(items.reduce((s, i) => s + i.debit, 0));
        const totalCredit = round2(items.reduce((s, i) => s + i.credit, 0));

        entries.push({
            date: row.date,
            description: `Kas Kecil: ${keterangan}`,
            items,
            totalDebit,
            totalCredit,
            balanced: Math.abs(totalDebit - totalCredit) < 0.01,
            sourceRow: row.rowNumber,
        });
    }

    return { entries, errors, warnings };
}

function generateFromTaxReport(rows: ParsedDocRow[]): GenerationResult {
    const entries: GeneratedEntry[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const row of rows) {
        const ppn = typeof row.values["PPN"] === "number" ? row.values["PPN"] as number : 0;
        const pph = typeof row.values["PPH"] === "number" ? row.values["PPH"] as number : 0;
        const jumlah = typeof row.values["JUMLAH"] === "number" ? row.values["JUMLAH"] as number : 0;
        const nama = String(row.values["NAMA"] || "");
        const npwp = String(row.values["NPWP"] || "");
        const masa = String(row.values["MASA PAJAK"] || "");

        const amount = pph || ppn || jumlah;
        if (amount === 0) continue;

        const items: GeneratedEntry["items"] = [];

        if (pph > 0) {
            items.push({ accountCode: PPH_RATES.PPh21.accountCode, accountName: "Pajak Badan (PPh)", debit: pph, credit: 0 });
            items.push({ accountCode: "111", accountName: "Bank BNI Giro", debit: 0, credit: pph });
        } else if (ppn > 0) {
            items.push({ accountCode: STANDARD_ACCOUNTS.PPN_KELUARAN, accountName: "PB 1/PHR (PPN)", debit: ppn, credit: 0 });
            items.push({ accountCode: "111", accountName: "Bank BNI Giro", debit: 0, credit: ppn });
        }

        if (items.length === 0) continue;

        const totalDebit = round2(items.reduce((s, i) => s + i.debit, 0));
        const totalCredit = round2(items.reduce((s, i) => s + i.credit, 0));
        const date = row.date || new Date().toISOString().slice(0, 10);
        const desc = [masa, npwp, nama].filter(Boolean).join(" — ") || `Pajak ${date}`;

        entries.push({
            date,
            description: `Pajak: ${desc}`,
            items,
            totalDebit,
            totalCredit,
            balanced: Math.abs(totalDebit - totalCredit) < 0.01,
            sourceRow: row.rowNumber,
        });
    }

    return { entries, errors, warnings };
}

function generateGeneric(
    rows: ParsedDocRow[],
    mappings: ColumnMapping[],
    docType: DocumentType,
): GenerationResult {
    const entries: GeneratedEntry[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    // Group by date for cashier_report; one entry per row for others
    if (docType === "cashier_report") {
        for (const row of rows) {
            if (!row.date) continue;

            const items = buildItemsFromMappings(row, mappings);
            if (items.length < 2) {
                warnings.push(`Baris ${row.rowNumber}: Tidak cukup data untuk jurnal.`);
                continue;
            }

            const totalDebit = round2(items.reduce((s, i) => s + i.debit, 0));
            const totalCredit = round2(items.reduce((s, i) => s + i.credit, 0));

            entries.push({
                date: row.date,
                description: `Laporan Kasir Harian — ${row.date}`,
                items,
                totalDebit,
                totalCredit,
                balanced: Math.abs(totalDebit - totalCredit) < 0.01,
                sourceRow: row.rowNumber,
            });
        }
    }

    return { entries, errors, warnings };
}

// ── Main dispatcher ─────────────────────────────────────────────────────────

export function generateJournalEntries(
    rows: ParsedDocRow[],
    docType: DocumentType,
): GenerationResult {
    switch (docType) {
        case "cashier_report": return generateFromCashierReport(rows);
        case "bank_statement": return generateFromBankStatement(rows);
        case "invoice": return generateFromInvoice(rows);
        case "purchase_order": return generateFromPurchaseOrder(rows);
        case "expense_report": return generateFromExpenseReport(rows);
        case "payroll": return generateFromPayroll(rows);
        case "petty_cash": return generateFromPettyCash(rows);
        case "tax_report": return generateFromTaxReport(rows);
        default:
            return { entries: [], errors: [`Tipe dokumen "${docType}" tidak didukung.`], warnings: [] };
    }
}

/** Source labels for JournalEntry.source field */
export const SOURCE_LABELS: Record<DocumentType, string> = {
    cashier_report: "daily_report",
    bank_statement: "bank_statement",
    invoice: "invoice",
    purchase_order: "purchase_order",
    expense_report: "expense_report",
    payroll: "payroll",
    petty_cash: "petty_cash",
    tax_report: "tax_report",
    unknown: "manual",
};
