/**
 * OCR-to-Journal Mapper
 *
 * Converts parsed OCR document data into GeneratedEntry[] compatible
 * with the existing importDocumentEntries() pipeline.
 */

import { AccDocType } from "@prisma/client";
import type { GeneratedEntry } from "./journal-generator";
import type { ScannedDocumentData, ScannedTransaction } from "./ocr-document-parser";

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

function makeEntry(
    date: string,
    description: string,
    items: GeneratedEntry["items"],
): GeneratedEntry {
    const totalDebit = round2(items.reduce((s, i) => s + i.debit, 0));
    const totalCredit = round2(items.reduce((s, i) => s + i.credit, 0));
    return {
        date,
        description,
        items,
        totalDebit,
        totalCredit,
        balanced: Math.abs(totalDebit - totalCredit) < 0.01,
        sourceRow: 0,
    };
}

// ─── TYPE-SPECIFIC MAPPERS ──────────────────────────────────────────────────

function mapPurchaseInvoice(data: ScannedDocumentData): GeneratedEntry[] {
    const date = data.date || new Date().toISOString().slice(0, 10);
    const total = data.totalAmount ?? data.subtotal ?? 0;
    const tax = data.taxAmount ?? 0;
    const dpp = data.subtotal ?? (total - tax);

    if (total === 0 && dpp === 0) return [];

    const items: GeneratedEntry["items"] = [];
    const desc = [data.referenceNumber, data.counterpartyName].filter(Boolean).join(" — ") || "Pembelian (scan)";

    if (dpp > 0) {
        items.push({ accountCode: "729", accountName: "Lainnya/Others (Pembelian)", debit: round2(dpp), credit: 0 });
    }
    if (tax > 0) {
        items.push({ accountCode: "320", accountName: "PB 1/PHR (PPN Masukan)", debit: round2(tax), credit: 0 });
    }
    items.push({ accountCode: "300", accountName: "Utang Usaha", debit: 0, credit: round2(dpp + tax || total) });

    return [makeEntry(date, `Invoice: ${desc}`, items)];
}

function mapSalesInvoice(data: ScannedDocumentData): GeneratedEntry[] {
    const date = data.date || new Date().toISOString().slice(0, 10);
    const total = data.totalAmount ?? data.subtotal ?? 0;
    const tax = data.taxAmount ?? 0;
    const dpp = data.subtotal ?? (total - tax);

    if (total === 0 && dpp === 0) return [];

    const items: GeneratedEntry["items"] = [];
    const desc = [data.referenceNumber, data.counterpartyName].filter(Boolean).join(" — ") || "Penjualan (scan)";

    items.push({ accountCode: "120", accountName: "Piutang Usaha", debit: round2(dpp + tax || total), credit: 0 });
    if (dpp > 0) {
        items.push({ accountCode: "600", accountName: "Food Restaurant", debit: 0, credit: round2(dpp) });
    }
    if (tax > 0) {
        items.push({ accountCode: "320", accountName: "PB 1/PHR (PPN Keluaran)", debit: 0, credit: round2(tax) });
    }

    return [makeEntry(date, `Penjualan: ${desc}`, items)];
}

function mapExpenseReceipt(data: ScannedDocumentData): GeneratedEntry[] {
    const date = data.date || new Date().toISOString().slice(0, 10);
    const total = data.totalAmount ?? 0;

    if (total === 0) return [];

    const desc = data.description || data.counterpartyName || "Pengeluaran (scan)";
    const items: GeneratedEntry["items"] = [
        { accountCode: "729", accountName: "Lainnya/Others (Pengeluaran)", debit: round2(total), credit: 0 },
        { accountCode: "100", accountName: "Petty Cash", debit: 0, credit: round2(total) },
    ];

    return [makeEntry(date, `Pengeluaran: ${desc}`, items)];
}

function mapBankStatement(data: ScannedDocumentData): GeneratedEntry[] {
    const entries: GeneratedEntry[] = [];

    for (const tx of data.transactions) {
        const txDate = tx.date || data.date || new Date().toISOString().slice(0, 10);
        const items: GeneratedEntry["items"] = [];

        if (tx.debit && tx.debit > 0) {
            items.push({ accountCode: "729", accountName: "Lainnya/Others", debit: round2(tx.debit), credit: 0 });
            items.push({ accountCode: "111", accountName: "Bank BNI Giro", debit: 0, credit: round2(tx.debit) });
        }

        if (tx.credit && tx.credit > 0) {
            items.push({ accountCode: "111", accountName: "Bank BNI Giro", debit: round2(tx.credit), credit: 0 });
            items.push({ accountCode: "902", accountName: "Pendapatan Lainnya", debit: 0, credit: round2(tx.credit) });
        }

        if (items.length >= 2) {
            entries.push(makeEntry(txDate, `Bank: ${tx.description}`, items));
        }
    }

    return entries;
}

function mapGenericDocument(data: ScannedDocumentData): GeneratedEntry[] {
    const date = data.date || new Date().toISOString().slice(0, 10);
    const total = data.totalAmount ?? 0;

    if (total === 0) return [];

    const desc = data.description || data.counterpartyName || "Transaksi (scan)";
    const items: GeneratedEntry["items"] = [
        { accountCode: "729", accountName: "Lainnya/Others", debit: round2(total), credit: 0 },
        { accountCode: "300", accountName: "Utang Usaha", debit: 0, credit: round2(total) },
    ];

    return [makeEntry(date, `Lainnya: ${desc}`, items)];
}

// ─── MAIN EXPORT ────────────────────────────────────────────────────────────

/**
 * Map parsed OCR document data to journal entries.
 * Returns GeneratedEntry[] compatible with importDocumentEntries().
 */
export function mapOcrToJournalEntries(data: ScannedDocumentData): GeneratedEntry[] {
    switch (data.documentType) {
        case AccDocType.PurchaseInvoice:
            return mapPurchaseInvoice(data);
        case AccDocType.SalesInvoice:
            return mapSalesInvoice(data);
        case AccDocType.ExpenseReceipt:
            return mapExpenseReceipt(data);
        case AccDocType.BankStatement:
            return mapBankStatement(data);
        default:
            return mapGenericDocument(data);
    }
}

/**
 * Maps AccDocType to the DocumentType used by importDocumentEntries.
 */
export function accDocTypeToImportDocType(accDocType: AccDocType): string {
    switch (accDocType) {
        case AccDocType.SalesInvoice:
        case AccDocType.PurchaseInvoice:
            return "invoice";
        case AccDocType.ExpenseReceipt:
            return "expense_report";
        case AccDocType.BankStatement:
            return "bank_statement";
        default:
            return "unknown";
    }
}
