/**
 * OCR Text Processor
 *
 * Takes raw OCR text from Tesseract.js and extracts structured data
 * for common Indonesian financial documents (receipts, invoices, tax docs).
 */

import type { DocumentType } from "./document-detector";

export interface OcrExtractedField {
    label: string;
    value: string;
    confidence: number; // 0-1
}

export interface OcrExtractedRow {
    date?: string;
    description: string;
    amount: number;
    type: "debit" | "credit";
}

export interface OcrResult {
    rawText: string;
    documentType: DocumentType;
    confidence: number;
    fields: OcrExtractedField[];
    rows: OcrExtractedRow[];
    warnings: string[];
}

// Patterns for Indonesian financial documents
const AMOUNT_PATTERN = /(?:Rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/g;
const DATE_PATTERN = /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/g;
const NPWP_PATTERN = /(\d{2}[.,]\d{3}[.,]\d{3}[.,]\d[-.]\d{3}[.,]\d{3})/;
const INVOICE_NO_PATTERN = /(?:NO|NOMOR|INV|FAKTUR)[.:\s]*([A-Z0-9\-\/]+)/i;

interface TypeSignature {
    type: DocumentType;
    keywords: string[];
    weight: number;
}

const TYPE_SIGNATURES: TypeSignature[] = [
    {
        type: "invoice",
        keywords: ["INVOICE", "FAKTUR", "TAGIHAN", "DPP", "PPN", "SUBTOTAL", "JATUH TEMPO", "DUE DATE"],
        weight: 1,
    },
    {
        type: "bank_statement",
        keywords: ["REKENING KORAN", "STATEMENT", "SALDO", "MUTASI", "BCA", "BNI", "MANDIRI", "BRI"],
        weight: 1,
    },
    {
        type: "cashier_report",
        keywords: ["KASIR", "CASHIER", "STRUK", "RECEIPT", "TOTAL", "TUNAI", "CASH", "KEMBALIAN", "CHANGE"],
        weight: 1,
    },
    {
        type: "tax_report",
        keywords: ["SPT", "NPWP", "FAKTUR PAJAK", "BUKTI POTONG", "PPH", "PPN", "MASA PAJAK", "DJP"],
        weight: 1,
    },
    {
        type: "expense_report",
        keywords: ["PENGELUARAN", "EXPENSE", "REIMBURSEMENT", "KWITANSI", "BUKTI BAYAR"],
        weight: 1,
    },
    {
        type: "payroll",
        keywords: ["GAJI", "SALARY", "PAYROLL", "SLIP GAJI", "TUNJANGAN", "POTONGAN", "BPJS", "PPH 21"],
        weight: 1,
    },
    {
        type: "petty_cash",
        keywords: ["KAS KECIL", "PETTY CASH", "VOUCHER"],
        weight: 1,
    },
    {
        type: "purchase_order",
        keywords: ["PURCHASE ORDER", "PO", "PESANAN", "ORDER"],
        weight: 0.8,
    },
];

/**
 * Detect document type from OCR text
 */
function detectDocumentType(text: string): { type: DocumentType; confidence: number } {
    const upperText = text.toUpperCase();
    let bestType: DocumentType = "unknown";
    let bestScore = 0;

    for (const sig of TYPE_SIGNATURES) {
        const matches = sig.keywords.filter((kw) => upperText.includes(kw));
        const score = (matches.length / sig.keywords.length) * sig.weight * 100;
        if (score > bestScore) {
            bestScore = score;
            bestType = sig.type;
        }
    }

    return { type: bestType, confidence: Math.min(Math.round(bestScore), 100) };
}

/**
 * Parse Indonesian currency amount string to number
 */
function parseAmount(str: string): number {
    // Remove "Rp", spaces, and handle Indonesian format (1.000.000,50)
    let cleaned = str.replace(/Rp\.?\s*/gi, "").trim();

    // If has comma as decimal separator (Indonesian format)
    if (/\d+\.\d{3}/.test(cleaned) && /,\d{2}$/.test(cleaned)) {
        cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else if (/\d+,\d{3}/.test(cleaned)) {
        cleaned = cleaned.replace(/,/g, "");
    } else {
        cleaned = cleaned.replace(/,/g, "");
    }

    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
}

/**
 * Extract key fields from OCR text
 */
function extractFields(text: string, docType: DocumentType): OcrExtractedField[] {
    const fields: OcrExtractedField[] = [];

    // Extract dates
    const dateMatches = text.matchAll(DATE_PATTERN);
    for (const m of dateMatches) {
        fields.push({
            label: "Tanggal",
            value: m[0],
            confidence: 0.8,
        });
        break; // Only take first date as primary
    }

    // Extract NPWP
    const npwpMatch = text.match(NPWP_PATTERN);
    if (npwpMatch) {
        fields.push({
            label: "NPWP",
            value: npwpMatch[1],
            confidence: 0.9,
        });
    }

    // Extract invoice number
    const invMatch = text.match(INVOICE_NO_PATTERN);
    if (invMatch) {
        fields.push({
            label: "No. Dokumen",
            value: invMatch[1],
            confidence: 0.7,
        });
    }

    // Extract amounts
    const amounts: number[] = [];
    const amountMatches = text.matchAll(AMOUNT_PATTERN);
    for (const m of amountMatches) {
        const amt = parseAmount(m[0]);
        if (amt > 0) amounts.push(amt);
    }

    // Sort amounts descending - largest is likely the total
    amounts.sort((a, b) => b - a);

    if (amounts.length > 0) {
        fields.push({
            label: "Total",
            value: `Rp ${amounts[0].toLocaleString("id-ID")}`,
            confidence: 0.7,
        });
    }

    if (amounts.length > 1 && docType === "invoice") {
        // Second largest might be DPP (before tax)
        fields.push({
            label: "DPP",
            value: `Rp ${amounts[1].toLocaleString("id-ID")}`,
            confidence: 0.5,
        });
    }

    return fields;
}

/**
 * Extract line items / rows from OCR text
 */
function extractRows(text: string, docType: DocumentType): OcrExtractedRow[] {
    const rows: OcrExtractedRow[] = [];
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

    for (const line of lines) {
        // Look for lines with amounts
        const amountMatch = line.match(/(?:Rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{2})?)/);
        if (!amountMatch) continue;

        const amount = parseAmount(amountMatch[1]);
        if (amount <= 0 || amount < 100) continue; // Skip tiny amounts (noise)

        // Extract date if present on this line
        const dateMatch = line.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
        const date = dateMatch ? dateMatch[0] : undefined;

        // Description is the text part (remove amounts and dates)
        let description = line
            .replace(/(?:Rp\.?\s*)?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?/g, "")
            .replace(/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/g, "")
            .replace(/[|:]/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        if (description.length < 2) description = "Item";

        // Determine debit/credit based on context
        const isCredit = /(?:KREDIT|CR|MASUK|TERIMA|BAYAR|PAID)/i.test(line);
        const type = isCredit ? "credit" : "debit";

        rows.push({ date, description, amount, type });
    }

    return rows;
}

/**
 * Main OCR processing function: takes raw text and returns structured data
 */
export function processOcrText(rawText: string): OcrResult {
    const warnings: string[] = [];

    if (rawText.length < 20) {
        warnings.push("Very little text extracted. Image may be blurry or low quality.");
    }

    const { type, confidence } = detectDocumentType(rawText);
    const fields = extractFields(rawText, type);
    const rows = extractRows(rawText, type);

    if (rows.length === 0) {
        warnings.push("No line items could be extracted. You may need to enter data manually.");
    }

    if (confidence < 30) {
        warnings.push("Document type could not be determined with confidence. Please verify.");
    }

    return {
        rawText,
        documentType: type,
        confidence,
        fields,
        rows,
        warnings,
    };
}
