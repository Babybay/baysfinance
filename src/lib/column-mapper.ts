/**
 * Column Mapper — fuzzy-matches file column headers to expected column schemas.
 *
 * Uses Fuse.js for fuzzy matching with Indonesian aliases.
 */

import Fuse from "fuse.js";
import type { DocumentType } from "./document-detector";
import type { ColumnMapping } from "./import-helpers";

// ── Column schemas per document type ────────────────────────────────────────

export interface ColumnSchema {
    /** Canonical name for this column */
    canonical: string;
    /** Known aliases (Indonesian + English + abbreviations) */
    aliases: string[];
    /** Whether this column is required */
    required: boolean;
}

export interface ColumnMatchResult {
    /** canonical → matched header from the file */
    matched: { canonical: string; fileHeader: string; score: number }[];
    /** File headers that couldn't be matched */
    unmatched: string[];
    /** Overall confidence 0-100 */
    confidence: number;
}

// ── Schema definitions per document type ────────────────────────────────────

const CASHIER_REPORT_SCHEMA: ColumnSchema[] = [
    { canonical: "TANGGAL", aliases: ["TGL", "DATE", "TANGGAL"], required: true },
    { canonical: "FOOD", aliases: ["FOOD", "MAKANAN", "F&B FOOD"], required: false },
    { canonical: "BEVERAGE", aliases: ["BEVERAGE", "MINUMAN", "BEV", "F&B BEVERAGE"], required: false },
    { canonical: "OTHER REVENUE", aliases: ["OTHER REVENUE", "PENDAPATAN LAIN", "LAINNYA", "OTHER REV"], required: false },
    { canonical: "TAX", aliases: ["TAX", "PAJAK", "PB1", "PB 1", "PHR"], required: false },
    { canonical: "SERVICE", aliases: ["SERVICE", "SERVIS", "SERVICE CHARGE", "SC"], required: false },
    { canonical: "CREDIT CARD BNI", aliases: ["CREDIT CARD BNI", "CC BNI", "KARTU KREDIT BNI", "EDC BNI"], required: false },
    { canonical: "CREDIT CARD BCA", aliases: ["CREDIT CARD BCA", "CC BCA", "KARTU KREDIT BCA", "EDC BCA"], required: false },
    { canonical: "QR BCA", aliases: ["QR BCA", "QRIS BCA", "QRIS BCA"], required: false },
    { canonical: "GOJEK", aliases: ["GOJEK", "GOPAY", "GO-PAY", "GO PAY"], required: false },
    { canonical: "QR BNI", aliases: ["QR BNI", "QRIS BNI"], required: false },
    { canonical: "QR BPR LESTARI", aliases: ["QR BPR LESTARI", "QR BPR", "QRIS BPR LESTARI", "QRIS BPR"], required: false },
    { canonical: "TOTAL KE BNI", aliases: ["TOTAL KE BNI", "SETORAN BNI", "KE BNI", "TOTAL/CASH/MOKKA"], required: false },
];

const BANK_STATEMENT_SCHEMA: ColumnSchema[] = [
    { canonical: "TANGGAL", aliases: ["TGL", "DATE", "TANGGAL", "TGL TRANSAKSI", "TGL VALUTA", "POSTING DATE"], required: true },
    { canonical: "KETERANGAN", aliases: ["KETERANGAN", "KET", "URAIAN", "DESCRIPTION", "DESKRIPSI", "REMARK", "NARASI"], required: true },
    { canonical: "DEBIT", aliases: ["DEBIT", "DEBET", "DB", "MUTASI DEBIT", "PENARIKAN", "KELUAR"], required: false },
    { canonical: "KREDIT", aliases: ["KREDIT", "CREDIT", "CR", "MUTASI KREDIT", "SETORAN", "MASUK"], required: false },
    { canonical: "SALDO", aliases: ["SALDO", "BALANCE", "SALDO AKHIR"], required: false },
    { canonical: "NO REF", aliases: ["NO REF", "REFERENSI", "REF", "NO REFERENSI", "NO TRANSAKSI"], required: false },
];

const INVOICE_SCHEMA: ColumnSchema[] = [
    { canonical: "NO INVOICE", aliases: ["NO INVOICE", "NOMOR INVOICE", "INVOICE NO", "NO. FAKTUR", "NO FAKTUR", "NOMOR FAKTUR", "INVOICE NUMBER"], required: false },
    { canonical: "TANGGAL", aliases: ["TGL", "DATE", "TANGGAL", "TANGGAL FAKTUR", "INVOICE DATE"], required: true },
    { canonical: "VENDOR", aliases: ["VENDOR", "CUSTOMER", "PELANGGAN", "SUPPLIER", "PENERIMA", "NAMA"], required: false },
    { canonical: "DESKRIPSI", aliases: ["DESKRIPSI", "DESCRIPTION", "ITEM", "URAIAN", "KETERANGAN", "KET"], required: false },
    { canonical: "QTY", aliases: ["QTY", "QUANTITY", "JUMLAH", "JML"], required: false },
    { canonical: "HARGA", aliases: ["HARGA", "HARGA SATUAN", "PRICE", "UNIT PRICE"], required: false },
    { canonical: "DPP", aliases: ["DPP", "SUBTOTAL", "SUB TOTAL", "DASAR PENGENAAN PAJAK"], required: false },
    { canonical: "PPN", aliases: ["PPN", "VAT", "PAJAK", "TAX"], required: false },
    { canonical: "TOTAL", aliases: ["TOTAL", "GRAND TOTAL", "JUMLAH", "AMOUNT"], required: false },
];

const PURCHASE_ORDER_SCHEMA: ColumnSchema[] = [
    { canonical: "NO PO", aliases: ["NO PO", "PO NUMBER", "NOMOR PO", "PURCHASE ORDER", "NO. PO"], required: false },
    { canonical: "TANGGAL", aliases: ["TGL", "DATE", "TANGGAL", "PO DATE"], required: true },
    { canonical: "SUPPLIER", aliases: ["SUPPLIER", "VENDOR", "PEMASOK", "NAMA SUPPLIER"], required: false },
    { canonical: "ITEM", aliases: ["ITEM", "DESKRIPSI", "BARANG", "DESCRIPTION", "NAMA BARANG"], required: false },
    { canonical: "QTY", aliases: ["QTY", "QUANTITY", "JUMLAH", "JML"], required: false },
    { canonical: "SATUAN", aliases: ["SATUAN", "UNIT", "UOM", "SAT"], required: false },
    { canonical: "HARGA", aliases: ["HARGA", "HARGA SATUAN", "UNIT PRICE", "PRICE"], required: false },
    { canonical: "TOTAL", aliases: ["TOTAL", "JUMLAH", "AMOUNT", "SUB TOTAL"], required: false },
];

const EXPENSE_REPORT_SCHEMA: ColumnSchema[] = [
    { canonical: "TANGGAL", aliases: ["TGL", "DATE", "TANGGAL"], required: true },
    { canonical: "KATEGORI", aliases: ["KATEGORI", "CATEGORY", "JENIS", "TYPE", "AKUN"], required: false },
    { canonical: "DESKRIPSI", aliases: ["DESKRIPSI", "DESCRIPTION", "KETERANGAN", "KET", "URAIAN"], required: false },
    { canonical: "JUMLAH", aliases: ["JUMLAH", "AMOUNT", "TOTAL", "NOMINAL", "JML"], required: true },
    { canonical: "BUKTI", aliases: ["BUKTI", "NO BUKTI", "RECEIPT", "NOTA", "KWITANSI"], required: false },
];

const PAYROLL_SCHEMA: ColumnSchema[] = [
    { canonical: "NAMA", aliases: ["NAMA", "NAME", "NAMA KARYAWAN", "EMPLOYEE"], required: true },
    { canonical: "JABATAN", aliases: ["JABATAN", "POSITION", "POSISI", "DEPARTMENT", "DEPT"], required: false },
    { canonical: "GAJI POKOK", aliases: ["GAJI POKOK", "BASIC SALARY", "GAJI", "SALARY", "GAPOK"], required: true },
    { canonical: "TUNJANGAN", aliases: ["TUNJANGAN", "ALLOWANCE", "TUNJ", "TOTAL TUNJANGAN"], required: false },
    { canonical: "LEMBUR", aliases: ["LEMBUR", "OVERTIME", "OT"], required: false },
    { canonical: "POTONGAN", aliases: ["POTONGAN", "DEDUCTION", "POT", "TOTAL POTONGAN"], required: false },
    { canonical: "BPJS", aliases: ["BPJS", "BPJS TK", "BPJS KESEHATAN", "JAMSOSTEK"], required: false },
    { canonical: "PPH 21", aliases: ["PPH 21", "PPH21", "PAJAK", "TAX"], required: false },
    { canonical: "TOTAL", aliases: ["TOTAL", "NET", "TAKE HOME PAY", "THP", "NET PAY", "TOTAL GAJI"], required: false },
];

const PETTY_CASH_SCHEMA: ColumnSchema[] = [
    { canonical: "TANGGAL", aliases: ["TGL", "DATE", "TANGGAL"], required: true },
    { canonical: "KETERANGAN", aliases: ["KETERANGAN", "KET", "URAIAN", "DESCRIPTION", "DESKRIPSI"], required: false },
    { canonical: "MASUK", aliases: ["MASUK", "IN", "PENERIMAAN", "TERIMA", "DEBIT"], required: false },
    { canonical: "KELUAR", aliases: ["KELUAR", "OUT", "PENGELUARAN", "BAYAR", "KREDIT"], required: false },
    { canonical: "SALDO", aliases: ["SALDO", "BALANCE", "SALDO AKHIR"], required: false },
    { canonical: "NO BUKTI", aliases: ["NO BUKTI", "BUKTI", "RECEIPT", "NOTA"], required: false },
];

const TAX_REPORT_SCHEMA: ColumnSchema[] = [
    { canonical: "NPWP", aliases: ["NPWP", "TAX ID", "NO NPWP"], required: false },
    { canonical: "NAMA", aliases: ["NAMA", "NAME", "NAMA WP", "WAJIB PAJAK"], required: false },
    { canonical: "MASA PAJAK", aliases: ["MASA PAJAK", "TAX PERIOD", "MASA", "PERIODE"], required: false },
    { canonical: "DPP", aliases: ["DPP", "DASAR PENGENAAN PAJAK", "TAX BASE"], required: false },
    { canonical: "PPN", aliases: ["PPN", "VAT", "PAJAK PERTAMBAHAN NILAI"], required: false },
    { canonical: "PPH", aliases: ["PPH", "PPH 21", "PPH 23", "PPH 4(2)", "INCOME TAX", "PAJAK PENGHASILAN"], required: false },
    { canonical: "TARIF", aliases: ["TARIF", "RATE", "PERSENTASE"], required: false },
    { canonical: "JUMLAH", aliases: ["JUMLAH", "AMOUNT", "TOTAL", "NOMINAL"], required: false },
];

const SCHEMAS: Record<DocumentType, ColumnSchema[]> = {
    cashier_report: CASHIER_REPORT_SCHEMA,
    bank_statement: BANK_STATEMENT_SCHEMA,
    invoice: INVOICE_SCHEMA,
    purchase_order: PURCHASE_ORDER_SCHEMA,
    expense_report: EXPENSE_REPORT_SCHEMA,
    payroll: PAYROLL_SCHEMA,
    petty_cash: PETTY_CASH_SCHEMA,
    tax_report: TAX_REPORT_SCHEMA,
    unknown: [],
};

/**
 * Match file column headers to a document type's expected schema.
 */
export function mapColumns(
    fileHeaders: string[],
    docType: DocumentType,
): ColumnMatchResult {
    const schema = SCHEMAS[docType];
    if (!schema || schema.length === 0) {
        return { matched: [], unmatched: fileHeaders, confidence: 0 };
    }

    // Build a Fuse index from all aliases across all schema columns
    const fuseItems = schema.flatMap((col) =>
        col.aliases.map((alias) => ({ canonical: col.canonical, alias: alias.toUpperCase() }))
    );

    const fuse = new Fuse(fuseItems, {
        keys: ["alias"],
        threshold: 0.3, // fairly strict — allows minor typos
        includeScore: true,
    });

    const matched: ColumnMatchResult["matched"] = [];
    const usedHeaders = new Set<string>();
    const usedCanonicals = new Set<string>();

    // First pass: exact matches
    for (const col of schema) {
        for (const header of fileHeaders) {
            const normHeader = header.toUpperCase().trim();
            if (usedHeaders.has(normHeader)) continue;
            if (usedCanonicals.has(col.canonical)) continue;

            const isExact = col.aliases.some(
                (alias) => alias.toUpperCase() === normHeader
            );
            if (isExact) {
                matched.push({ canonical: col.canonical, fileHeader: header, score: 1 });
                usedHeaders.add(normHeader);
                usedCanonicals.add(col.canonical);
                break;
            }
        }
    }

    // Second pass: fuzzy matches for remaining columns
    for (const col of schema) {
        if (usedCanonicals.has(col.canonical)) continue;

        let bestMatch: { fileHeader: string; score: number } | null = null;

        for (const header of fileHeaders) {
            if (usedHeaders.has(header.toUpperCase().trim())) continue;

            const results = fuse.search(header.toUpperCase().trim());
            const match = results.find((r) => r.item.canonical === col.canonical);
            if (match && match.score !== undefined) {
                const score = 1 - match.score; // Fuse score 0=perfect, so invert
                if (!bestMatch || score > bestMatch.score) {
                    bestMatch = { fileHeader: header, score };
                }
            }
        }

        if (bestMatch && bestMatch.score > 0.5) {
            matched.push({ canonical: col.canonical, fileHeader: bestMatch.fileHeader, score: bestMatch.score });
            usedHeaders.add(bestMatch.fileHeader.toUpperCase().trim());
            usedCanonicals.add(col.canonical);
        }
    }

    const unmatched = fileHeaders.filter((h) => !usedHeaders.has(h.toUpperCase().trim()));

    // Confidence = (matched required + matched optional) weighted
    const requiredCols = schema.filter((c) => c.required);
    const matchedRequired = requiredCols.filter((c) => usedCanonicals.has(c.canonical)).length;
    const requiredRatio = requiredCols.length > 0 ? matchedRequired / requiredCols.length : 1;
    const totalRatio = matched.length / schema.length;
    const confidence = Math.round(requiredRatio * 60 + totalRatio * 40);

    return { matched, unmatched, confidence };
}

/** Get the column schema for a given document type */
export function getSchema(docType: DocumentType): ColumnSchema[] {
    return SCHEMAS[docType] || [];
}

// ── Account mappings per document type ──────────────────────────────────────

export function getAccountMappings(docType: DocumentType): ColumnMapping[] {
    switch (docType) {
        case "cashier_report":
            return CASHIER_REPORT_ACCOUNT_MAPPINGS;
        case "bank_statement":
            return BANK_STATEMENT_ACCOUNT_MAPPINGS;
        case "invoice":
            return INVOICE_ACCOUNT_MAPPINGS;
        case "purchase_order":
            return PURCHASE_ORDER_ACCOUNT_MAPPINGS;
        case "expense_report":
            return EXPENSE_REPORT_ACCOUNT_MAPPINGS;
        case "payroll":
            return PAYROLL_ACCOUNT_MAPPINGS;
        case "petty_cash":
            return PETTY_CASH_ACCOUNT_MAPPINGS;
        case "tax_report":
            return TAX_REPORT_ACCOUNT_MAPPINGS;
        default:
            return [];
    }
}

const CASHIER_REPORT_ACCOUNT_MAPPINGS: ColumnMapping[] = [
    { column: "FOOD", accountCode: "600", accountName: "Food Restaurant", side: "credit" },
    { column: "BEVERAGE", accountCode: "601", accountName: "Beverage Restaurant", side: "credit" },
    { column: "OTHER REVENUE", accountCode: "604", accountName: "Others Revenue", side: "credit" },
    { column: "TAX", accountCode: "320", accountName: "PB 1/PHR", side: "credit" },
    { column: "SERVICE", accountCode: "604", accountName: "Others Revenue (Service)", side: "credit" },
    { column: "CREDIT CARD BNI", accountCode: "120", accountName: "Piutang Usaha (CC BNI)", side: "debit" },
    { column: "CREDIT CARD BCA", accountCode: "120", accountName: "Piutang Usaha (CC BCA)", side: "debit" },
    { column: "QR BCA", accountCode: "113", accountName: "Bank BCA (QR)", side: "debit" },
    { column: "GOJEK", accountCode: "120", accountName: "Piutang Usaha (Gojek)", side: "debit" },
    { column: "QR BNI", accountCode: "111", accountName: "Bank BNI Giro (QR)", side: "debit" },
    { column: "QR BPR LESTARI", accountCode: "114", accountName: "Bank BPR Lestari (QR)", side: "debit" },
    { column: "TOTAL KE BNI", accountCode: "111", accountName: "Bank BNI Giro", side: "debit" },
];

const BANK_STATEMENT_ACCOUNT_MAPPINGS: ColumnMapping[] = [
    { column: "DEBIT", accountCode: "729", accountName: "Lainnya/Others (Bank Debit)", side: "debit" },
    { column: "KREDIT", accountCode: "902", accountName: "Pendapatan Lainnya (Bank Credit)", side: "credit" },
];

const INVOICE_ACCOUNT_MAPPINGS: ColumnMapping[] = [
    { column: "DPP", accountCode: "300", accountName: "Utang Usaha", side: "credit" },
    { column: "PPN", accountCode: "320", accountName: "PB 1/PHR (PPN)", side: "debit" },
    { column: "TOTAL", accountCode: "300", accountName: "Utang Usaha (Total)", side: "credit" },
];

const PURCHASE_ORDER_ACCOUNT_MAPPINGS: ColumnMapping[] = [
    { column: "TOTAL", accountCode: "300", accountName: "Utang Usaha", side: "credit" },
];

const EXPENSE_REPORT_ACCOUNT_MAPPINGS: ColumnMapping[] = [
    { column: "JUMLAH", accountCode: "729", accountName: "Lainnya/Others (Expense)", side: "debit" },
];

const PAYROLL_ACCOUNT_MAPPINGS: ColumnMapping[] = [
    { column: "GAJI POKOK", accountCode: "700", accountName: "Gaji dan Upah", side: "debit" },
    { column: "TUNJANGAN", accountCode: "701", accountName: "Tunjangan Hari Raya", side: "debit" },
    { column: "LEMBUR", accountCode: "700", accountName: "Gaji dan Upah (Lembur)", side: "debit" },
    { column: "BPJS", accountCode: "310", accountName: "Utang Lain Lain (BPJS)", side: "credit" },
    { column: "PPH 21", accountCode: "321", accountName: "Pajak Badan (PPh 21)", side: "credit" },
    { column: "TOTAL", accountCode: "300", accountName: "Utang Usaha (Gaji)", side: "credit" },
];

const PETTY_CASH_ACCOUNT_MAPPINGS: ColumnMapping[] = [
    { column: "MASUK", accountCode: "100", accountName: "Petty Cash (In)", side: "debit" },
    { column: "KELUAR", accountCode: "100", accountName: "Petty Cash (Out)", side: "credit" },
];

const TAX_REPORT_ACCOUNT_MAPPINGS: ColumnMapping[] = [
    { column: "DPP", accountCode: "604", accountName: "Others Revenue (DPP)", side: "credit" },
    { column: "PPN", accountCode: "320", accountName: "PB 1/PHR (PPN)", side: "credit" },
    { column: "PPH", accountCode: "321", accountName: "Pajak Badan (PPh)", side: "debit" },
];
