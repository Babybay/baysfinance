/**
 * Smart Document Detector
 *
 * Reads the first rows of an Excel/CSV file and auto-detects the document type
 * based on column header fingerprints.
 */

export type DocumentType =
    | "cashier_report"
    | "bank_statement"
    | "invoice"
    | "purchase_order"
    | "expense_report"
    | "payroll"
    | "petty_cash"
    | "tax_report"
    | "unknown";

export interface DetectionResult {
    type: DocumentType;
    confidence: number; // 0-100
    label: string;
    detectedColumns: string[];
    allColumns: string[];
}

interface Fingerprint {
    type: DocumentType;
    label: string;
    /** Headers that strongly identify this document type */
    primary: string[];
    /** Headers that add confidence when present */
    secondary: string[];
    /** Minimum primary matches needed */
    minPrimary: number;
    /** Weight for each primary match (out of 100) */
    primaryWeight: number;
    /** Weight for each secondary match (out of 100) */
    secondaryWeight: number;
}

const FINGERPRINTS: Fingerprint[] = [
    {
        type: "cashier_report",
        label: "Laporan Kasir Harian",
        primary: ["FOOD", "BEVERAGE", "MOKKA", "TOTAL KE BNI"],
        secondary: ["TAX", "SERVICE", "CREDIT CARD", "QR BCA", "QR BNI", "GOJEK", "OTHER REVENUE", "COMPLIMENT"],
        minPrimary: 1,
        primaryWeight: 25,
        secondaryWeight: 8,
    },
    {
        type: "bank_statement",
        label: "Rekening Koran",
        primary: ["SALDO", "MUTASI", "REKENING KORAN"],
        secondary: ["TANGGAL", "KETERANGAN", "DEBIT", "KREDIT", "NO REK", "CABANG", "VALUTA"],
        minPrimary: 1,
        primaryWeight: 30,
        secondaryWeight: 10,
    },
    {
        type: "invoice",
        label: "Invoice / Faktur",
        primary: ["INVOICE", "FAKTUR", "NO. FAKTUR", "NO FAKTUR", "NOMOR INVOICE"],
        secondary: ["VENDOR", "CUSTOMER", "SUBTOTAL", "PPN", "PAJAK", "TOTAL", "DPP", "JATUH TEMPO"],
        minPrimary: 1,
        primaryWeight: 35,
        secondaryWeight: 8,
    },
    {
        type: "purchase_order",
        label: "Purchase Order",
        primary: ["PURCHASE ORDER", "PO NUMBER", "NO PO", "NOMOR PO"],
        secondary: ["SUPPLIER", "QTY", "HARGA", "SATUAN", "JUMLAH", "TOTAL"],
        minPrimary: 1,
        primaryWeight: 35,
        secondaryWeight: 8,
    },
    {
        type: "expense_report",
        label: "Laporan Pengeluaran",
        primary: ["PENGELUARAN", "EXPENSE", "LAPORAN PENGELUARAN"],
        secondary: ["KATEGORI", "DESKRIPSI", "JUMLAH", "BUKTI", "TANGGAL", "KETERANGAN"],
        minPrimary: 1,
        primaryWeight: 30,
        secondaryWeight: 10,
    },
    {
        type: "payroll",
        label: "Slip Gaji / Payroll",
        primary: ["GAJI", "PAYROLL", "GAJI POKOK", "TUNJANGAN"],
        secondary: ["NAMA", "JABATAN", "POTONGAN", "BPJS", "PPH 21", "LEMBUR", "TOTAL", "NET"],
        minPrimary: 1,
        primaryWeight: 25,
        secondaryWeight: 10,
    },
    {
        type: "petty_cash",
        label: "Kas Kecil / Petty Cash",
        primary: ["KAS KECIL", "PETTY CASH"],
        secondary: ["MASUK", "KELUAR", "SALDO", "TANGGAL", "KETERANGAN", "NO BUKTI"],
        minPrimary: 1,
        primaryWeight: 40,
        secondaryWeight: 10,
    },
    {
        type: "tax_report",
        label: "Laporan Pajak / SPT",
        primary: ["NPWP", "SPT", "FAKTUR PAJAK"],
        secondary: ["MASA PAJAK", "DPP", "PPN", "PPH", "PKP", "TARIF"],
        minPrimary: 1,
        primaryWeight: 30,
        secondaryWeight: 12,
    },
];

/**
 * Normalize a string for matching: uppercase, strip extra whitespace
 */
function normalize(s: string): string {
    return s.toUpperCase().replace(/\s+/g, " ").trim();
}

/**
 * Check if any of the fingerprint keywords appear within the column text.
 * Supports partial matches (e.g., "CREDIT CARD BNI" matches "CREDIT CARD").
 */
function matchesKeyword(columns: string[], keyword: string): boolean {
    const normKeyword = normalize(keyword);
    return columns.some((col) => {
        const normCol = normalize(col);
        return normCol.includes(normKeyword) || normKeyword.includes(normCol);
    });
}

/**
 * Detect document type from extracted column headers.
 *
 * @param headers - Column headers from the first rows of the file
 * @returns DetectionResult with type and confidence score
 */
export function detectFromHeaders(headers: string[]): DetectionResult {
    const normalizedHeaders = headers.map(normalize).filter(Boolean);

    let bestResult: DetectionResult = {
        type: "unknown",
        confidence: 0,
        label: "Tidak Dikenali",
        detectedColumns: [],
        allColumns: headers,
    };

    for (const fp of FINGERPRINTS) {
        const primaryMatches = fp.primary.filter((kw) => matchesKeyword(normalizedHeaders, kw));
        const secondaryMatches = fp.secondary.filter((kw) => matchesKeyword(normalizedHeaders, kw));

        if (primaryMatches.length < fp.minPrimary) continue;

        const confidence = Math.min(
            100,
            primaryMatches.length * fp.primaryWeight + secondaryMatches.length * fp.secondaryWeight,
        );

        if (confidence > bestResult.confidence) {
            bestResult = {
                type: fp.type,
                confidence,
                label: fp.label,
                detectedColumns: [...primaryMatches, ...secondaryMatches],
                allColumns: headers,
            };
        }
    }

    return bestResult;
}

/**
 * Extract column headers from raw sheet rows.
 * Scans the first 20 rows for the row with the most non-empty cells
 * (likely the header row).
 */
export function extractHeaders(rawRows: Record<string, unknown>[]): {
    headers: string[];
    headerRowIndex: number;
} {
    let bestRow = 0;
    let bestCount = 0;
    let bestHeaders: string[] = [];

    const limit = Math.min(rawRows.length, 20);

    for (let i = 0; i < limit; i++) {
        const row = rawRows[i];
        const vals = Object.values(row)
            .map((v) => String(v ?? "").trim())
            .filter(Boolean);

        if (vals.length > bestCount) {
            bestCount = vals.length;
            bestHeaders = vals;
            bestRow = i;
        }
    }

    return { headers: bestHeaders, headerRowIndex: bestRow };
}

/** Human-readable labels for document types */
export const DOCUMENT_TYPE_LABELS: Record<DocumentType, { en: string; id: string }> = {
    cashier_report: { en: "Daily Cashier Report", id: "Laporan Kasir Harian" },
    bank_statement: { en: "Bank Statement", id: "Rekening Koran" },
    invoice: { en: "Invoice / Faktur", id: "Invoice / Faktur" },
    purchase_order: { en: "Purchase Order", id: "Purchase Order" },
    expense_report: { en: "Expense Report", id: "Laporan Pengeluaran" },
    payroll: { en: "Payroll / Salary", id: "Slip Gaji / Payroll" },
    petty_cash: { en: "Petty Cash", id: "Kas Kecil" },
    tax_report: { en: "Tax Report / SPT", id: "Laporan Pajak / SPT" },
    unknown: { en: "Unknown", id: "Tidak Dikenali" },
};
