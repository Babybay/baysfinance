/**
 * Mapping Reader — reads sheet "10_MAPPING_AKUN" from the Excel template
 * and builds a per-sheet column→account mapping.
 */

import type { WorkBook } from "xlsx";
import * as XLSX from "xlsx";

export interface MappingEntry {
    col: string;       // source column name (e.g., "FOOD")
    accountCode: string; // e.g., "4101"
    name: string;       // e.g., "Pendapatan Makanan"
    side: "DEBIT" | "CREDIT" | "SKIP";
    notes: string;
}

export type SheetMappings = Record<string, MappingEntry[]>;

/**
 * Read the 10_MAPPING_AKUN sheet and return a mapping per sheet name.
 *
 * Expected columns (row 3 or 4 = header):
 *   A: SHEET | B: KOLOM SUMBER | C: KODE AKUN | D: NAMA AKUN | E: POSISI | F: KETERANGAN
 */
export function readMappingSheet(workbook: WorkBook): SheetMappings {
    const SHEET_NAME = "10_MAPPING_AKUN";
    const sheet = workbook.Sheets[SHEET_NAME];

    if (!sheet) {
        // Fallback: try variations
        const alt = Object.keys(workbook.Sheets).find(
            (n) => n.toUpperCase().includes("MAPPING") || n.includes("10_")
        );
        if (!alt) return getDefaultMappings();
        return readFromSheet(workbook.Sheets[alt]);
    }

    return readFromSheet(sheet);
}

function readFromSheet(sheet: XLSX.WorkSheet): SheetMappings {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    const mappings: SheetMappings = {};

    // Find the header row
    let headerIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const vals = Object.values(rows[i]).map((v) => String(v ?? "").toUpperCase().trim());
        if (vals.some((v) => v === "SHEET" || v === "KOLOM SUMBER")) {
            headerIdx = i;
            break;
        }
    }
    if (headerIdx === -1) headerIdx = 2; // default: row 3 (0-indexed = 2)

    const keys = Object.keys(rows[headerIdx] || {});
    const dataRows = rows.slice(headerIdx + 1);

    for (const row of dataRows) {
        const vals = keys.map((k) => String(row[k] ?? "").trim());
        const sheetName = vals[0];
        const colName = vals[1];
        const accountCode = vals[2];
        const accountName = vals[3];
        const posisi = vals[4]?.toUpperCase();
        const notes = vals[5] || "";

        if (!sheetName || !colName) continue;

        const side: MappingEntry["side"] =
            posisi === "DEBIT" ? "DEBIT" :
            posisi === "CREDIT" || posisi === "KREDIT" ? "CREDIT" :
            "SKIP";

        if (!mappings[sheetName]) mappings[sheetName] = [];
        mappings[sheetName].push({
            col: colName,
            accountCode: accountCode || "—",
            name: accountName || "",
            side,
            notes,
        });
    }

    return Object.keys(mappings).length > 0 ? mappings : getDefaultMappings();
}

/**
 * Default mappings if 10_MAPPING_AKUN sheet is missing.
 * Matches the spec in the task description.
 */
function getDefaultMappings(): SheetMappings {
    return {
        "1_LAPORAN_PENJUALAN": [
            { col: "FOOD", accountCode: "4101", name: "Pendapatan Makanan", side: "CREDIT", notes: "" },
            { col: "BEVERAGE", accountCode: "4102", name: "Pendapatan Minuman", side: "CREDIT", notes: "" },
            { col: "OTHER REVENUE", accountCode: "4103", name: "Pendapatan Lainnya", side: "CREDIT", notes: "" },
            { col: "TAX", accountCode: "2201", name: "Hutang PPN", side: "CREDIT", notes: "" },
            { col: "SERVICE", accountCode: "4104", name: "Pendapatan Service", side: "CREDIT", notes: "" },
            { col: "TOTAL PENDAPATAN", accountCode: "—", name: "—", side: "SKIP", notes: "" },
            { col: "COMPLIMENT VOUCHER", accountCode: "5901", name: "Beban Compliment", side: "DEBIT", notes: "" },
            { col: "COMPLIMENT BAND", accountCode: "5901", name: "Beban Compliment", side: "DEBIT", notes: "" },
            { col: "TOTAL COMPLIMENT", accountCode: "—", name: "—", side: "SKIP", notes: "" },
            { col: "TOTAL/CASH MOKKA", accountCode: "1101", name: "Kas Tunai", side: "DEBIT", notes: "" },
            { col: "CREDIT CARD BNI", accountCode: "1121", name: "Piutang CC BNI", side: "DEBIT", notes: "" },
            { col: "CREDIT CARD BCA", accountCode: "1122", name: "Piutang CC BCA", side: "DEBIT", notes: "" },
            { col: "QR BCA", accountCode: "1131", name: "Piutang QRIS BCA", side: "DEBIT", notes: "" },
            { col: "GOJEK", accountCode: "1132", name: "Piutang Gojek", side: "DEBIT", notes: "" },
            { col: "QR BNI", accountCode: "1133", name: "Piutang QRIS BNI", side: "DEBIT", notes: "" },
            { col: "QR BPR LESTARI", accountCode: "1134", name: "Piutang BPR Lestari", side: "DEBIT", notes: "" },
            { col: "TOTAL PEMBAYARAN", accountCode: "—", name: "—", side: "SKIP", notes: "" },
            { col: "TOTAL KE BNI", accountCode: "1111", name: "Bank BNI", side: "DEBIT", notes: "" },
        ],
        "2_PIUTANG_LAIN_LAIN": [
            { col: "TOTAL/CASH", accountCode: "1201", name: "Piutang Lain-Lain", side: "DEBIT", notes: "" },
        ],
        "3_ASET_MANAJEMEN": [
            { col: "BIAYA PEROLEHAN 2024", accountCode: "1501", name: "Aset Tetap Inventaris", side: "DEBIT", notes: "" },
            { col: "AKUMULASI PENYUSUTAN 2024", accountCode: "1511", name: "Akm. Penyusutan Inventaris", side: "CREDIT", notes: "" },
            { col: "BEBAN PENYUSUTAN 2024", accountCode: "5701", name: "Beban Penyusutan Inventaris", side: "DEBIT", notes: "" },
        ],
        "4_ASET_OWNER": [
            { col: "BIAYA PEROLEHAN 2024", accountCode: "1502", name: "Aset Tetap Inventaris (Owner)", side: "DEBIT", notes: "" },
            { col: "AKUMULASI PENYUSUTAN 2024", accountCode: "1512", name: "Akm. Penyusutan (Owner)", side: "CREDIT", notes: "" },
        ],
        "5_BIAYA_PRA_OPERASI": [
            { col: "BIAYA PEROLEHAN 2024", accountCode: "1601", name: "Biaya Pra Operasi", side: "DEBIT", notes: "" },
            { col: "AKUMULASI AMORTISASI 2024", accountCode: "1611", name: "Akm. Amortisasi Pra Operasi", side: "CREDIT", notes: "" },
            { col: "BEBAN AMORTISASI 2024", accountCode: "5702", name: "Beban Amortisasi", side: "DEBIT", notes: "" },
        ],
        "6_HUTANG_USAHA": [
            { col: "TOTAL/CASH", accountCode: "2101", name: "Hutang Usaha", side: "CREDIT", notes: "" },
        ],
        "7_HUTANG_OWNER": [
            { col: "TOTAL", accountCode: "3201", name: "Modal/Hutang Owner", side: "CREDIT", notes: "" },
        ],
    };
}
