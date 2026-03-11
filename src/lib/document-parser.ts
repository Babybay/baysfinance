/**
 * Universal Document Parser
 *
 * Parses .xlsx, .xls, .csv files into a standardized format.
 * Handles merged cells, empty rows, Indonesian number/date formats.
 */

import type { DocumentType } from "./document-detector";
import type { ColumnMatchResult } from "./column-mapper";

// ── Shared types ────────────────────────────────────────────────────────────

export interface ParsedDocument {
    type: DocumentType;
    headers: string[];
    /** Each row maps canonical column name → parsed value */
    rows: ParsedDocRow[];
    /** Raw data for preview (first N rows from the file as-is) */
    rawPreview: Record<string, unknown>[];
    columnMapping: ColumnMatchResult;
    errors: string[];
    warnings: string[];
}

export interface ParsedDocRow {
    rowNumber: number;
    date: string | null; // ISO YYYY-MM-DD
    values: Record<string, number | string>;
}

// ── Indonesian number parsing ───────────────────────────────────────────────

/**
 * Parse Indonesian-format number: 1.000.000,00 → 1000000.00
 * Also handles regular numbers and Excel numeric cells.
 */
export function parseIndonesianAmount(value: unknown): number {
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === "number") return Math.round(value * 100) / 100;

    let str = String(value).trim();

    // Remove currency prefix (Rp, IDR)
    str = str.replace(/^(Rp\.?\s*|IDR\s*)/i, "");

    // Remove parentheses (negative indicator in accounting)
    const isNegative = str.startsWith("(") && str.endsWith(")");
    if (isNegative) str = str.slice(1, -1);

    // Detect Indonesian format: periods as thousand separators, comma as decimal
    // Pattern: digits separated by periods, optionally ending with comma + digits
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(str)) {
        str = str.replace(/\./g, "").replace(",", ".");
    } else if (/^\d+(,\d+)$/.test(str)) {
        // Simple comma decimal: 1000,50
        str = str.replace(",", ".");
    } else {
        // Standard: remove commas as thousand separators
        str = str.replace(/,/g, "");
    }

    // Remove any remaining non-numeric chars except . and -
    str = str.replace(/[^\d.\-]/g, "");

    const num = parseFloat(str);
    if (isNaN(num)) return 0;
    return Math.round((isNegative ? -num : num) * 100) / 100;
}

/**
 * Parse date value — supports Excel serial, DD/MM/YYYY, YYYY-MM-DD, and variations.
 */
export function parseDate(value: unknown): string | null {
    if (!value) return null;

    // Excel serial date number
    if (typeof value === "number") {
        const epoch = new Date(1899, 11, 30);
        const date = new Date(epoch.getTime() + value * 86400000);
        if (isNaN(date.getTime())) return null;
        return date.toISOString().slice(0, 10);
    }

    const str = String(value).trim();
    if (!str) return null;

    // ISO format YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);

    // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    const match = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
    if (match) {
        const [, d, m, y] = match;
        return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }

    // MM/DD/YYYY fallback (if month > 12, swap)
    const match2 = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
    if (match2) {
        const [, a, b, rawY] = match2;
        const y = rawY.length === 2 ? `20${rawY}` : rawY;
        // If first number > 12, it must be day (Indonesian DD/MM)
        if (parseInt(a) > 12) return `${y}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`;
        return `${y}-${a.padStart(2, "0")}-${b.padStart(2, "0")}`;
    }

    // Indonesian month names
    const idMonths: Record<string, string> = {
        jan: "01", januari: "01", feb: "02", februari: "02",
        mar: "03", maret: "03", apr: "04", april: "04",
        mei: "05", may: "05", jun: "06", juni: "06",
        jul: "07", juli: "07", aug: "08", agu: "08", agustus: "08",
        sep: "09", sept: "09", september: "09",
        okt: "10", oct: "10", oktober: "10",
        nov: "11", nop: "11", november: "11",
        des: "12", dec: "12", desember: "12",
    };
    const monthMatch = str.match(/^(\d{1,2})\s+(\w+)\s+(\d{4})$/i);
    if (monthMatch) {
        const [, d, monthStr, y] = monthMatch;
        const m = idMonths[monthStr.toLowerCase()];
        if (m) return `${y}-${m}-${d.padStart(2, "0")}`;
    }

    // Fallback: native Date parse
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);

    return null;
}

// ── Find header row ─────────────────────────────────────────────────────────

/**
 * Find the best header row in raw data.
 * Returns the row index and the column key → header name mapping.
 */
export function findHeaderRow(
    rawRows: Record<string, unknown>[],
    targetHeaders?: string[], // optional: expected headers to look for
): { headerIndex: number; columnMap: Record<string, string> } | null {
    const limit = Math.min(rawRows.length, 20);
    let bestIndex = -1;
    let bestScore = 0;
    let bestMap: Record<string, string> = {};

    for (let i = 0; i < limit; i++) {
        const row = rawRows[i];
        const keys = Object.keys(row);
        const values = keys.map((k) => String(row[k] ?? "").trim()).filter(Boolean);

        if (values.length < 2) continue;

        let score = values.length; // base score = number of non-empty cells

        // Boost score if target headers match
        if (targetHeaders && targetHeaders.length > 0) {
            const upperValues = values.map((v) => v.toUpperCase());
            const matches = targetHeaders.filter((h) =>
                upperValues.some((v) => v.includes(h.toUpperCase()))
            ).length;
            score += matches * 10;
        }

        if (score > bestScore) {
            bestScore = score;
            bestIndex = i;
            bestMap = {};
            for (let j = 0; j < keys.length; j++) {
                const header = String(row[keys[j]] ?? "").trim();
                if (header) bestMap[header.toUpperCase()] = keys[j];
            }
        }
    }

    if (bestIndex === -1) return null;
    return { headerIndex: bestIndex, columnMap: bestMap };
}

// ── Parse rows with column mapping ──────────────────────────────────────────

/**
 * Parse raw sheet data into standardized ParsedDocRows using the column mapping result.
 */
export function parseRows(
    rawRows: Record<string, unknown>[],
    headerIndex: number,
    columnMap: Record<string, string>, // UPPERCASE header → raw key
    columnMatch: ColumnMatchResult,
    docType: DocumentType,
): { rows: ParsedDocRow[]; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const rows: ParsedDocRow[] = [];

    const dataRows = rawRows.slice(headerIndex + 1);

    // Build canonical → raw key lookup
    const canonicalToKey = new Map<string, string>();
    for (const m of columnMatch.matched) {
        const rawKey = columnMap[m.fileHeader.toUpperCase().trim()];
        if (rawKey) canonicalToKey.set(m.canonical, rawKey);
    }

    // Determine which canonical column holds the date
    const dateCanonical = canonicalToKey.has("TANGGAL") ? "TANGGAL" : null;

    // Numeric-only columns per type (skip for text columns)
    const textColumns = new Set(["KETERANGAN", "DESKRIPSI", "VENDOR", "CUSTOMER", "SUPPLIER",
        "ITEM", "NAMA", "JABATAN", "NO INVOICE", "NO PO", "NO REF", "NO BUKTI",
        "NPWP", "NAMA", "MASA PAJAK", "SATUAN", "BUKTI"]);

    let rowNum = 0;
    for (const row of dataRows) {
        rowNum++;
        const absRow = rowNum + headerIndex + 1;

        // Get date if available
        let date: string | null = null;
        if (dateCanonical) {
            const rawKey = canonicalToKey.get(dateCanonical);
            if (rawKey) {
                const rawDate = row[rawKey];
                if (!rawDate) continue; // skip rows without date

                const dateStr = String(rawDate).trim().toUpperCase();
                if (dateStr === "TOTAL" || dateStr === "GRAND TOTAL" || dateStr === "SUB TOTAL") continue;

                date = parseDate(rawDate);
                if (!date) {
                    warnings.push(`Baris ${absRow}: Format tanggal tidak valid: "${rawDate}"`);
                    continue;
                }
            }
        }

        // Parse all mapped values
        const values: Record<string, number | string> = {};
        let hasValue = false;

        for (const m of columnMatch.matched) {
            const rawKey = columnMap[m.fileHeader.toUpperCase().trim()];
            if (!rawKey) continue;

            const rawVal = row[rawKey];
            if (textColumns.has(m.canonical)) {
                values[m.canonical] = String(rawVal ?? "").trim();
                if (values[m.canonical]) hasValue = true;
            } else if (m.canonical === "TANGGAL") {
                // Already handled above
                values[m.canonical] = date || "";
            } else {
                values[m.canonical] = parseIndonesianAmount(rawVal);
                if (values[m.canonical] !== 0) hasValue = true;
            }
        }

        if (!hasValue && !date) continue; // skip fully empty rows

        // For types without a date column, we still include the row
        if (!dateCanonical && !hasValue) continue;

        rows.push({ rowNumber: absRow, date, values });
    }

    if (rows.length === 0) {
        errors.push("Tidak ada data yang valid ditemukan dalam file.");
    }

    // Validate specific types
    if (docType === "payroll" && rows.length > 0 && !rows[0].values["NAMA"]) {
        warnings.push("Kolom NAMA tidak ditemukan — data mungkin tidak lengkap.");
    }

    return { rows, errors, warnings };
}
