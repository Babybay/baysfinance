/**
 * Universal OCR Document Parser
 *
 * Parses OCR text into structured data for all document types:
 * invoices, receipts, bank statements, and generic documents.
 *
 * Reuses parseInvoiceText from invoice-scanner.ts for invoice parsing.
 */

import { AccDocType } from "@prisma/client";
import { parseInvoiceText, type ScannedLineItem } from "./invoice-scanner";
import type { GeneratedEntry } from "./journal-generator";

// ─── TYPES ──────────────────────────────────────────────────────────────────

export interface ScannedTransaction {
    date: string | null;
    description: string;
    debit: number | null;
    credit: number | null;
    balance: number | null;
}

export interface SuggestedJournalEntry {
    description: string;
    items: { accountCode: string; accountName: string; debit: number; credit: number }[];
}

export interface ScannedDocumentData {
    documentType: AccDocType;
    detectedType: string;
    confidence: number;
    date: string | null;
    description: string | null;
    referenceNumber: string | null;
    counterpartyName: string | null;
    totalAmount: number | null;
    taxAmount: number | null;
    subtotal: number | null;
    lineItems: ScannedLineItem[];
    transactions: ScannedTransaction[];
    suggestedEntries: SuggestedJournalEntry[];
    rawText: string;
}

// ─── SHARED HELPERS (from invoice-scanner patterns) ─────────────────────────

function parseNumber(str: string): number | null {
    if (!str) return null;
    let cleaned = str.replace(/[^\d.,\-]/g, "").trim();
    if (!cleaned || cleaned === "." || cleaned === ",") return null;

    if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(cleaned)) {
        cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(cleaned)) {
        cleaned = cleaned.replace(/,/g, "");
    } else if (/^\d+,\d{1,2}$/.test(cleaned)) {
        cleaned = cleaned.replace(",", ".");
    } else if (/^\d{1,3}\.\d{3}$/.test(cleaned)) {
        cleaned = cleaned.replace(/\./g, "");
    } else {
        cleaned = cleaned.replace(/,/g, "").replace(/\.(?=.*\.)/g, "");
    }

    const val = parseFloat(cleaned);
    return isNaN(val) ? null : val;
}

const MONTH_MAP: Record<string, string> = {
    januari: "01", februari: "02", maret: "03", april: "04",
    mei: "05", juni: "06", juli: "07", agustus: "08",
    september: "09", oktober: "10", november: "11", desember: "12",
    jan: "01", feb: "02", mar: "03", apr: "04",
    jun: "06", jul: "07", ags: "08", agu: "08", sep: "09", okt: "10", nov: "11", des: "12",
    january: "01", february: "02", march: "03",
    may: "05", june: "06", july: "07", august: "08",
    october: "10", december: "12",
    aug: "08", oct: "10", dec: "12",
};

function expandYear(y: string): string {
    if (y.length === 4) return y;
    const n = parseInt(y, 10);
    return n >= 0 && n <= 50 ? `20${y.padStart(2, "0")}` : `19${y.padStart(2, "0")}`;
}

function parseDate(str: string): string | null {
    if (!str) return null;
    const s = str.trim();

    const iso = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;

    const dmonY = s.match(/(\d{1,2})[/\-.\s]([A-Za-z]{3,})[/\-.\s](\d{2,4})/);
    if (dmonY) {
        const m = MONTH_MAP[dmonY[2].toLowerCase()];
        if (m) return `${expandYear(dmonY[3])}-${m}-${dmonY[1].padStart(2, "0")}`;
    }

    const dmy4 = s.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);
    if (dmy4) return `${dmy4[3]}-${dmy4[2].padStart(2, "0")}-${dmy4[1].padStart(2, "0")}`;

    const dmy2 = s.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2})(?!\d)/);
    if (dmy2) return `${expandYear(dmy2[3])}-${dmy2[2].padStart(2, "0")}-${dmy2[1].padStart(2, "0")}`;

    const named = s.match(/(\d{1,2})\s+(\w+)\s+(\d{2,4})/i);
    if (named) {
        const m = MONTH_MAP[named[2].toLowerCase()];
        if (m) return `${expandYear(named[3])}-${m}-${named[1].padStart(2, "0")}`;
    }

    return null;
}

function findFirstDate(text: string): string | null {
    const patterns = [
        /\d{4}-\d{1,2}-\d{1,2}/,
        /\d{1,2}[/\-.\s][A-Za-z]{3,}[/\-.\s]\d{2,4}/,
        /\d{1,2}[/\-.\s]\d{1,2}[/\-.\s]\d{2,4}/,
    ];
    for (const pat of patterns) {
        const m = text.match(pat);
        if (m) {
            const parsed = parseDate(m[0]);
            if (parsed) return parsed;
        }
    }
    return null;
}

function findNearLabel(text: string, labelPattern: RegExp): string[] {
    const lines = text.split("\n");
    const results: string[] = [];
    for (let i = 0; i < lines.length; i++) {
        if (labelPattern.test(lines[i])) {
            const afterLabel = lines[i].replace(labelPattern, "").trim();
            if (afterLabel.length > 1) results.push(afterLabel);
            if (i + 1 < lines.length && lines[i + 1].trim().length > 1) {
                results.push(lines[i + 1].trim());
            }
        }
    }
    return results;
}

function extractAmountNearLabel(text: string, labelPattern: RegExp): number | null {
    const candidates = findNearLabel(text, labelPattern);
    for (const c of candidates) {
        const numPattern = /(?:Rp\.?\s*)?([\d.,]{4,})/g;
        let m;
        const numbers: number[] = [];
        while ((m = numPattern.exec(c)) !== null) {
            const val = parseNumber(m[1]);
            if (val !== null && val > 0) numbers.push(val);
        }
        if (numbers.length > 0) return Math.max(...numbers);
    }
    return null;
}

function extractReferenceNumber(text: string): string | null {
    const codePatterns = [
        /\b(INV[\-/]?[A-Z0-9\-/]{3,})\b/i,
        /\b(FKT[\-/]?[A-Z0-9\-/]{3,})\b/i,
        /\b(KW[\-/]?[A-Z0-9\-/]{3,})\b/i,
        /\b(RCV[\-/]?[A-Z0-9\-/]{3,})\b/i,
        /\b(BKM[\-/]?[A-Z0-9\-/]{3,})\b/i,
        /\b(BKK[\-/]?[A-Z0-9\-/]{3,})\b/i,
    ];
    for (const pat of codePatterns) {
        const m = text.match(pat);
        if (m) return m[1];
    }

    const labelCandidates = findNearLabel(text, /(?:no\.?\s*(?:nota|faktur|invoice|kwitansi|bukti|ref|referensi))\b/i);
    for (const c of labelCandidates) {
        const codeMatch = c.match(/([A-Z0-9][\w\-/]{3,})/i);
        if (codeMatch) return codeMatch[1];
    }

    return null;
}

function extractCounterpartyName(text: string): string | null {
    const labels = [
        /(?:dari|from|supplier|vendor|penjual|pengirim|diterbitkan\s*oleh)[:\s]*(.*)/i,
        /(?:kepada\s*(?:yth\.?)?)\s*[:\s.]*(.*)/i,
        /(?:bill\s*to|ship\s*to|pembeli|customer|pelanggan|penerima)\s*[:\s.]*(.*)/i,
    ];
    for (const pat of labels) {
        const m = text.match(pat);
        if (m && m[1]?.trim().length > 2) return m[1].trim();
    }

    const lines = text.split("\n").slice(0, 8);
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.length < 3 || trimmed.length > 80) continue;
        if (/^(?:PT|CV|UD|Firma|Toko)\b/i.test(trimmed)) {
            return trimmed.replace(/[|].*$/, "").trim();
        }
    }

    return null;
}

// ─── PARSERS ────────────────────────────────────────────────────────────────

function parseSalesInvoice(rawText: string): ScannedDocumentData {
    const inv = parseInvoiceText(rawText);
    return {
        documentType: AccDocType.SalesInvoice,
        detectedType: "Faktur Penjualan",
        confidence: inv.confidence,
        date: inv.invoiceDate,
        description: [inv.invoiceNumber, inv.customerName].filter(Boolean).join(" — ") || null,
        referenceNumber: inv.invoiceNumber,
        counterpartyName: inv.customerName || inv.vendorName,
        totalAmount: inv.grandTotal,
        taxAmount: inv.taxAmount,
        subtotal: inv.subtotal,
        lineItems: inv.lineItems,
        transactions: [],
        suggestedEntries: [],
        rawText,
    };
}

function parsePurchaseInvoice(rawText: string): ScannedDocumentData {
    const inv = parseInvoiceText(rawText);
    return {
        documentType: AccDocType.PurchaseInvoice,
        detectedType: "Faktur Pembelian",
        confidence: inv.confidence,
        date: inv.invoiceDate,
        description: [inv.invoiceNumber, inv.vendorName].filter(Boolean).join(" — ") || null,
        referenceNumber: inv.invoiceNumber,
        counterpartyName: inv.vendorName || inv.customerName,
        totalAmount: inv.grandTotal,
        taxAmount: inv.taxAmount,
        subtotal: inv.subtotal,
        lineItems: inv.lineItems,
        transactions: [],
        suggestedEntries: [],
        rawText,
    };
}

function parseExpenseReceipt(rawText: string): ScannedDocumentData {
    const date = findFirstDate(rawText);
    const refNumber = extractReferenceNumber(rawText);
    const counterparty = extractCounterpartyName(rawText);

    // Extract total amount
    const totalAmount =
        extractAmountNearLabel(rawText, /(?:total|jumlah|amount|sejumlah)\b/i) ??
        extractAmountNearLabel(rawText, /(?:Rp\.?)\s*/i);

    // Try to extract description near "untuk" or "keperluan"
    let description: string | null = null;
    const descCandidates = findNearLabel(rawText, /(?:untuk|keperluan|keterangan|guna)\b/i);
    if (descCandidates.length > 0) description = descCandidates[0];

    // Tax
    const taxAmount = extractAmountNearLabel(rawText, /(?:ppn|pajak|tax)\b/i);

    let confidence = 0;
    if (date) confidence += 20;
    if (refNumber) confidence += 15;
    if (totalAmount) confidence += 30;
    if (counterparty) confidence += 15;
    if (description) confidence += 10;
    if (taxAmount) confidence += 10;

    return {
        documentType: AccDocType.ExpenseReceipt,
        detectedType: "Bukti Pengeluaran",
        confidence: Math.min(100, confidence),
        date,
        description,
        referenceNumber: refNumber,
        counterpartyName: counterparty,
        totalAmount,
        taxAmount,
        subtotal: totalAmount && taxAmount ? totalAmount - taxAmount : totalAmount,
        lineItems: [],
        transactions: [],
        suggestedEntries: [],
        rawText,
    };
}

function parseBankStatement(rawText: string): ScannedDocumentData {
    const lines = rawText.split("\n");
    const transactions: ScannedTransaction[] = [];

    // Try to extract individual transaction lines
    // Bank statement lines typically have: date, description, debit/credit, balance
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.length < 15) continue;

        // Look for lines that start with a date
        const dateMatch = trimmed.match(/^(\d{1,2}[/\-.\s]\d{1,2}[/\-.\s]\d{2,4})/);
        if (!dateMatch) continue;

        const txDate = parseDate(dateMatch[1]);
        if (!txDate) continue;

        const rest = trimmed.slice(dateMatch[0].length).trim();

        // Try to extract amounts from the rest of the line
        const amounts: number[] = [];
        const amountPattern = /(?:Rp\.?\s*)?([\d.,]{4,})/g;
        let m;
        while ((m = amountPattern.exec(rest)) !== null) {
            const val = parseNumber(m[1]);
            if (val !== null) amounts.push(val);
        }

        // Extract description (text before the first amount)
        const firstAmountIdx = rest.search(/(?:Rp\.?\s*)?[\d.,]{4,}/);
        const desc = firstAmountIdx > 0 ? rest.slice(0, firstAmountIdx).trim() : rest;

        if (amounts.length >= 1) {
            transactions.push({
                date: txDate,
                description: desc || "Transaksi",
                debit: amounts.length >= 2 ? (amounts[0] > 0 ? amounts[0] : null) : null,
                credit: amounts.length >= 2 ? (amounts[1] > 0 ? amounts[1] : null) : (amounts[0] > 0 ? amounts[0] : null),
                balance: amounts.length >= 3 ? amounts[amounts.length - 1] : null,
            });
        }
    }

    const date = findFirstDate(rawText);
    const counterparty = extractCounterpartyName(rawText);

    // Extract account number
    let refNumber: string | null = null;
    const accNumMatch = rawText.match(/(?:no\.?\s*rek(?:ening)?|account\s*no)[:\s]*([0-9\-]{5,})/i);
    if (accNumMatch) refNumber = accNumMatch[1];

    let confidence = 0;
    if (transactions.length > 0) confidence += 40;
    if (transactions.length > 3) confidence += 15;
    if (date) confidence += 15;
    if (refNumber) confidence += 15;
    if (counterparty) confidence += 15;

    return {
        documentType: AccDocType.BankStatement,
        detectedType: "Rekening Koran",
        confidence: Math.min(100, confidence),
        date,
        description: refNumber ? `Rekening ${refNumber}` : null,
        referenceNumber: refNumber,
        counterpartyName: counterparty,
        totalAmount: null,
        taxAmount: null,
        subtotal: null,
        lineItems: [],
        transactions,
        suggestedEntries: [],
        rawText,
    };
}

function parseGenericDocument(rawText: string): ScannedDocumentData {
    const date = findFirstDate(rawText);
    const refNumber = extractReferenceNumber(rawText);
    const counterparty = extractCounterpartyName(rawText);
    const totalAmount = extractAmountNearLabel(rawText, /(?:total|jumlah|amount|sejumlah|grand\s*total)\b/i);

    let confidence = 0;
    if (date) confidence += 20;
    if (refNumber) confidence += 15;
    if (totalAmount) confidence += 25;
    if (counterparty) confidence += 15;

    return {
        documentType: AccDocType.Other,
        detectedType: "Dokumen Lainnya",
        confidence: Math.min(100, confidence),
        date,
        description: null,
        referenceNumber: refNumber,
        counterpartyName: counterparty,
        totalAmount,
        taxAmount: null,
        subtotal: null,
        lineItems: [],
        transactions: [],
        suggestedEntries: [],
        rawText,
    };
}

// ─── MAIN EXPORT ────────────────────────────────────────────────────────────

/**
 * Parse OCR text into structured data based on detected document type.
 */
export function parseOcrDocument(rawText: string, docType: AccDocType): ScannedDocumentData {
    switch (docType) {
        case AccDocType.SalesInvoice:
            return parseSalesInvoice(rawText);
        case AccDocType.PurchaseInvoice:
            return parsePurchaseInvoice(rawText);
        case AccDocType.ExpenseReceipt:
            return parseExpenseReceipt(rawText);
        case AccDocType.BankStatement:
            return parseBankStatement(rawText);
        default:
            return parseGenericDocument(rawText);
    }
}
