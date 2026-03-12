/**
 * OCR Document Classifier
 *
 * Detects document type from raw OCR text using keyword fingerprinting.
 * Maps to both AccDocType (Prisma enum) and DocumentType (import pipeline).
 */

import { AccDocType, AccDocModule } from "@prisma/client";
import type { DocumentType } from "./document-detector";

export interface OcrClassificationResult {
    accDocType: AccDocType;
    accDocModule: AccDocModule;
    detectorDocType: DocumentType;
    confidence: number;
    label: string;
}

interface OcrFingerprint {
    accDocType: AccDocType;
    accDocModule: AccDocModule;
    detectorDocType: DocumentType;
    label: string;
    /** Keywords that strongly identify this document type */
    primary: string[];
    /** Keywords that add confidence when present */
    secondary: string[];
    primaryWeight: number;
    secondaryWeight: number;
}

const OCR_FINGERPRINTS: OcrFingerprint[] = [
    {
        accDocType: AccDocType.SalesInvoice,
        accDocModule: AccDocModule.Receivable,
        detectorDocType: "invoice",
        label: "Faktur Penjualan",
        primary: ["faktur penjualan", "sales invoice", "nota penjualan"],
        secondary: ["kepada yth", "bill to", "ship to", "pelanggan", "customer", "piutang"],
        primaryWeight: 30,
        secondaryWeight: 10,
    },
    {
        accDocType: AccDocType.PurchaseInvoice,
        accDocModule: AccDocModule.Payable,
        detectorDocType: "invoice",
        label: "Faktur Pembelian",
        primary: ["faktur pembelian", "purchase invoice", "invoice", "no.nota", "no.faktur", "no. nota", "no. faktur"],
        secondary: ["dari", "supplier", "vendor", "utang", "pembelian"],
        primaryWeight: 25,
        secondaryWeight: 8,
    },
    {
        accDocType: AccDocType.ExpenseReceipt,
        accDocModule: AccDocModule.Expense,
        detectorDocType: "expense_report",
        label: "Bukti Pengeluaran / Kwitansi",
        primary: ["kwitansi", "bukti pengeluaran", "receipt", "bon", "struk"],
        secondary: ["telah diterima", "pembayaran", "tunai", "cash", "lunas"],
        primaryWeight: 30,
        secondaryWeight: 10,
    },
    {
        accDocType: AccDocType.BankStatement,
        accDocModule: AccDocModule.Cashflow,
        detectorDocType: "bank_statement",
        label: "Rekening Koran",
        primary: ["rekening koran", "bank statement", "mutasi", "saldo"],
        secondary: ["debit", "kredit", "transaksi", "cabang", "no rek", "valuta"],
        primaryWeight: 30,
        secondaryWeight: 10,
    },
    {
        accDocType: AccDocType.Other,
        accDocModule: AccDocModule.Expense,
        detectorDocType: "payroll",
        label: "Slip Gaji / Payroll",
        primary: ["slip gaji", "payroll", "gaji pokok", "take home pay"],
        secondary: ["tunjangan", "potongan", "bpjs", "pph 21", "lembur"],
        primaryWeight: 30,
        secondaryWeight: 10,
    },
    {
        accDocType: AccDocType.Other,
        accDocModule: AccDocModule.Expense,
        detectorDocType: "tax_report",
        label: "Dokumen Pajak",
        primary: ["spt", "faktur pajak", "bukti potong"],
        secondary: ["npwp", "pph", "ppn", "masa pajak", "dpp", "pkp"],
        primaryWeight: 30,
        secondaryWeight: 10,
    },
];

/**
 * Classify OCR text into a document type.
 */
export function classifyOcrText(rawText: string): OcrClassificationResult {
    const textLower = rawText.toLowerCase();

    let best: OcrClassificationResult = {
        accDocType: AccDocType.Other,
        accDocModule: AccDocModule.Expense,
        detectorDocType: "unknown",
        confidence: 0,
        label: "Tidak Dikenali",
    };

    for (const fp of OCR_FINGERPRINTS) {
        const primaryMatches = fp.primary.filter((kw) => textLower.includes(kw));
        const secondaryMatches = fp.secondary.filter((kw) => textLower.includes(kw));

        if (primaryMatches.length === 0) continue;

        const confidence = Math.min(
            100,
            primaryMatches.length * fp.primaryWeight + secondaryMatches.length * fp.secondaryWeight,
        );

        if (confidence > best.confidence) {
            best = {
                accDocType: fp.accDocType,
                accDocModule: fp.accDocModule,
                detectorDocType: fp.detectorDocType,
                confidence,
                label: fp.label,
            };
        }
    }

    // Fallback: if we see any amount patterns + date patterns, it's likely a purchase invoice
    if (best.confidence === 0) {
        const hasAmounts = /(?:rp\.?\s*)?[\d.,]{4,}/i.test(rawText);
        const hasDates = /\d{1,2}[/\-.\s]\d{1,2}[/\-.\s]\d{2,4}/.test(rawText);
        if (hasAmounts && hasDates) {
            best = {
                accDocType: AccDocType.PurchaseInvoice,
                accDocModule: AccDocModule.Payable,
                detectorDocType: "invoice",
                confidence: 15,
                label: "Faktur (auto-detected)",
            };
        }
    }

    return best;
}
