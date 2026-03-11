/**
 * Per-sheet parsers for the standardized Excel template.
 *
 * Each parser reads a specific sheet and returns structured data
 * ready for DB insertion.
 */

import type { WorkSheet } from "xlsx";
import * as XLSX from "xlsx";
import { parseIDNumber, parseIDDate } from "./number-parser";
import type { MappingEntry } from "./mapping-reader";

// ── Shared types ────────────────────────────────────────────────────────────

export interface JournalEntryData {
    date: Date;
    description: string;
    source: string;
    refNumber?: string;
    items: { accountCode: string; accountName: string; debit: number; credit: number }[];
    totalDebit: number;
    totalCredit: number;
}

export interface FixedAssetData {
    source: string;
    name: string;
    acquisitionDate: Date | null;
    quantity: number;
    depreciationRate: number;
    costPrev: number;
    mutasiIn: number;
    mutasiOut: number;
    costCurrent: number;
    accumDeprecPrev: number;
    deprecCurrentIn: number;
    deprecCurrentOut: number;
    accumDeprecCurrent: number;
    bookValue: number;
}

export interface FinancialLineItem {
    label: string;
    currentPeriod: number;
    previousPeriod: number;
}

export interface SheetResult {
    entries: JournalEntryData[];
    assets: FixedAssetData[];
    financialData: FinancialLineItem[];
    warnings: string[];
    errors: string[];
}

function emptyResult(): SheetResult {
    return { entries: [], assets: [], financialData: [], warnings: [], errors: [] };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Read a single cell value from a worksheet. */
function cell(ws: WorkSheet, ref: string): unknown {
    const c = ws[ref];
    return c ? c.v : undefined;
}

/**
 * Build a column-key lookup from the header row of a worksheet.
 * Returns: normalized header → column letter (e.g., "FOOD" → "D")
 */
function buildHeaderMap(ws: WorkSheet, headerRow: number): Map<string, string> {
    const map = new Map<string, string>();
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1");

    for (let c = range.s.c; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r: headerRow - 1, c });
        const val = cell(ws, addr);
        if (val) {
            const header = String(val).trim().toUpperCase();
            const colLetter = XLSX.utils.encode_col(c);
            map.set(header, colLetter);
        }
    }
    return map;
}

/** Get cell value by column letter and row number. */
function cellByCol(ws: WorkSheet, col: string, row: number): unknown {
    return cell(ws, `${col}${row}`);
}

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

// ── SHEET 1: LAPORAN PENJUALAN ──────────────────────────────────────────────

export function parseLaporanPenjualan(
    ws: WorkSheet,
    mappings: MappingEntry[],
    clientId: string,
): SheetResult {
    const result = emptyResult();
    const HEADER_ROW = 5;
    const DATA_START = 6;
    const DATA_END = 36;

    const headerMap = buildHeaderMap(ws, HEADER_ROW);

    // Find TANGGAL column (usually B)
    const tanggalCol = headerMap.get("TANGGAL") || headerMap.get("TGL") || "B";

    // Build mapping col → column letter lookup
    const mappingColLookup = new Map<string, string>();
    for (const m of mappings) {
        const colKey = m.col.toUpperCase();
        // Try exact match, then partial
        const found = headerMap.get(colKey) ||
            [...headerMap.entries()].find(([h]) => h.includes(colKey) || colKey.includes(h))?.[1];
        if (found) mappingColLookup.set(m.col, found);
    }

    for (let row = DATA_START; row <= DATA_END; row++) {
        const rawDate = cellByCol(ws, tanggalCol, row);
        if (!rawDate) continue;

        const dateStr = parseIDDate(rawDate);
        if (!dateStr) {
            result.warnings.push(`Sheet 1 baris ${row}: Format tanggal tidak valid: "${rawDate}"`);
            continue;
        }

        const date = new Date(dateStr);
        const items: JournalEntryData["items"] = [];

        // Track compliment amounts for merging
        let complimentTotal = 0;
        let complimentCode = "";
        let complimentName = "";

        for (const m of mappings) {
            if (m.side === "SKIP") continue;

            const colLetter = mappingColLookup.get(m.col);
            if (!colLetter) continue;

            const amount = parseIDNumber(cellByCol(ws, colLetter, row));
            if (amount === 0) continue;

            // Merge COMPLIMENT VOUCHER + COMPLIMENT BAND
            if (m.col.toUpperCase().startsWith("COMPLIMENT") && m.side === "DEBIT") {
                complimentTotal += amount;
                complimentCode = m.accountCode;
                complimentName = m.name;
                continue;
            }

            items.push({
                accountCode: m.accountCode,
                accountName: m.name,
                debit: m.side === "DEBIT" ? round2(amount) : 0,
                credit: m.side === "CREDIT" ? round2(amount) : 0,
            });
        }

        // Add merged compliment line
        if (complimentTotal > 0 && complimentCode) {
            items.push({
                accountCode: complimentCode,
                accountName: complimentName,
                debit: round2(complimentTotal),
                credit: 0,
            });
        }

        if (items.length < 2) continue;

        const totalDebit = round2(items.reduce((s, i) => s + i.debit, 0));
        const totalCredit = round2(items.reduce((s, i) => s + i.credit, 0));

        if (Math.abs(totalDebit - totalCredit) > 1) {
            result.warnings.push(
                `Sheet 1 baris ${row} (${dateStr}): Selisih D/C = ${Math.abs(totalDebit - totalCredit).toLocaleString("id-ID")}`
            );
        }

        result.entries.push({
            date,
            description: `Laporan Penjualan ${dateStr}`,
            source: "LAPORAN_PENJUALAN",
            refNumber: `KAS/${clientId}/${dateStr}`,
            items,
            totalDebit,
            totalCredit,
        });
    }

    return result;
}

// ── SHEET 2: PIUTANG LAIN LAIN ──────────────────────────────────────────────

export function parsePiutangLainLain(ws: WorkSheet): SheetResult {
    const result = emptyResult();
    const DATA_START = 6;
    const DATA_END = 25;

    for (let row = DATA_START; row <= DATA_END; row++) {
        const rawDate = cell(ws, `B${row}`);
        const keterangan = String(cell(ws, `C${row}`) ?? "").trim();
        const amount = parseIDNumber(cell(ws, `D${row}`));

        if (!keterangan || amount === 0) continue;

        const dateStr = parseIDDate(rawDate);
        const date = dateStr ? new Date(dateStr) : new Date();

        result.entries.push({
            date,
            description: keterangan,
            source: "PIUTANG_LAIN_LAIN",
            items: [
                { accountCode: "1201", accountName: "Piutang Lain-Lain", debit: round2(amount), credit: 0 },
                { accountCode: "1101", accountName: "Kas Tunai", debit: 0, credit: round2(amount) },
            ],
            totalDebit: round2(amount),
            totalCredit: round2(amount),
        });
    }

    return result;
}

// ── SHEET 3 & 4: ASET TETAP ────────────────────────────────────────────────

export function parseAsetTetap(
    ws: WorkSheet,
    source: "ASET_MANAJEMEN" | "ASET_OWNER",
    _mappings?: MappingEntry[],
): SheetResult {
    const result = emptyResult();
    const DATA_START = 7;
    const DATA_END = 56;

    let totalDeprecIn = 0;
    const deprecCode = source === "ASET_MANAJEMEN" ? "5701" : "5701";
    const deprecName = source === "ASET_MANAJEMEN"
        ? "Beban Penyusutan Inventaris"
        : "Beban Penyusutan Inventaris (Owner)";
    const accumCode = source === "ASET_MANAJEMEN" ? "1511" : "1512";
    const accumName = source === "ASET_MANAJEMEN"
        ? "Akm. Penyusutan Inventaris"
        : "Akm. Penyusutan (Owner)";

    for (let row = DATA_START; row <= DATA_END; row++) {
        const name = String(cell(ws, `B${row}`) ?? "").trim();
        if (!name) continue;

        const acquisitionDate = parseIDDate(cell(ws, `C${row}`));
        const quantity = Math.max(1, Math.round(parseIDNumber(cell(ws, `D${row}`)) || 1));
        const depRate = parseIDNumber(cell(ws, `E${row}`));
        const costPrev = parseIDNumber(cell(ws, `F${row}`));
        const mutIn = parseIDNumber(cell(ws, `G${row}`));
        const mutOut = parseIDNumber(cell(ws, `H${row}`));
        const costCurr = parseIDNumber(cell(ws, `I${row}`));
        const accumPrev = parseIDNumber(cell(ws, `J${row}`));
        const deprecIn = parseIDNumber(cell(ws, `K${row}`));
        const deprecOut = parseIDNumber(cell(ws, `L${row}`));
        const accumCurr = parseIDNumber(cell(ws, `M${row}`));
        const bookVal = parseIDNumber(cell(ws, `N${row}`));

        totalDeprecIn += deprecIn;

        result.assets.push({
            source,
            name,
            acquisitionDate: acquisitionDate ? new Date(acquisitionDate) : null,
            quantity,
            depreciationRate: depRate,
            costPrev,
            mutasiIn: mutIn,
            mutasiOut: mutOut,
            costCurrent: costCurr || round2(costPrev + mutIn - mutOut),
            accumDeprecPrev: accumPrev,
            deprecCurrentIn: deprecIn,
            deprecCurrentOut: deprecOut,
            accumDeprecCurrent: accumCurr || round2(accumPrev + deprecIn - deprecOut),
            bookValue: bookVal || round2((costCurr || costPrev + mutIn - mutOut) - (accumCurr || accumPrev + deprecIn - deprecOut)),
        });
    }

    // Summary journal entry for depreciation
    if (totalDeprecIn > 0) {
        result.entries.push({
            date: new Date(),
            description: `Penyusutan Aset Tetap ${source === "ASET_MANAJEMEN" ? "Manajemen" : "Owner"}`,
            source,
            items: [
                { accountCode: deprecCode, accountName: deprecName, debit: round2(totalDeprecIn), credit: 0 },
                { accountCode: accumCode, accountName: accumName, debit: 0, credit: round2(totalDeprecIn) },
            ],
            totalDebit: round2(totalDeprecIn),
            totalCredit: round2(totalDeprecIn),
        });
    }

    return result;
}

// ── SHEET 5: BIAYA PRA OPERASI ──────────────────────────────────────────────

export function parseBiayaPraOperasi(ws: WorkSheet): SheetResult {
    const result = emptyResult();
    const DATA_START = 6;
    const DATA_END = 55;

    let totalAmortIn = 0;

    for (let row = DATA_START; row <= DATA_END; row++) {
        const name = String(cell(ws, `B${row}`) ?? "").trim();
        if (!name) continue;

        const acquisitionDate = parseIDDate(cell(ws, `C${row}`));
        const quantity = Math.max(1, Math.round(parseIDNumber(cell(ws, `D${row}`)) || 1));
        const depRate = parseIDNumber(cell(ws, `E${row}`));
        const costPrev = parseIDNumber(cell(ws, `F${row}`));
        const mutIn = parseIDNumber(cell(ws, `G${row}`));
        const mutOut = parseIDNumber(cell(ws, `H${row}`));
        const costCurr = parseIDNumber(cell(ws, `I${row}`));
        const accumPrev = parseIDNumber(cell(ws, `J${row}`));
        // Col J is BEBAN AMORTISASI per spec row mapping
        const amortIn = parseIDNumber(cell(ws, `K${row}`));
        const amortOut = parseIDNumber(cell(ws, `L${row}`));
        const accumCurr = parseIDNumber(cell(ws, `M${row}`));
        const bookVal = parseIDNumber(cell(ws, `N${row}`));

        totalAmortIn += amortIn;

        result.assets.push({
            source: "BIAYA_PRA_OPERASI",
            name,
            acquisitionDate: acquisitionDate ? new Date(acquisitionDate) : null,
            quantity,
            depreciationRate: depRate,
            costPrev,
            mutasiIn: mutIn,
            mutasiOut: mutOut,
            costCurrent: costCurr || round2(costPrev + mutIn - mutOut),
            accumDeprecPrev: accumPrev,
            deprecCurrentIn: amortIn,
            deprecCurrentOut: amortOut,
            accumDeprecCurrent: accumCurr || round2(accumPrev + amortIn - amortOut),
            bookValue: bookVal || round2((costCurr || costPrev + mutIn - mutOut) - (accumCurr || accumPrev + amortIn - amortOut)),
        });
    }

    // Summary journal entry for amortization
    if (totalAmortIn > 0) {
        result.entries.push({
            date: new Date(),
            description: "Amortisasi Biaya Pra Operasi",
            source: "BIAYA_PRA_OPERASI",
            items: [
                { accountCode: "5702", accountName: "Beban Amortisasi", debit: round2(totalAmortIn), credit: 0 },
                { accountCode: "1611", accountName: "Akm. Amortisasi Pra Operasi", debit: 0, credit: round2(totalAmortIn) },
            ],
            totalDebit: round2(totalAmortIn),
            totalCredit: round2(totalAmortIn),
        });
    }

    return result;
}

// ── SHEET 6: HUTANG USAHA ───────────────────────────────────────────────────

export function parseHutangUsaha(ws: WorkSheet): SheetResult {
    const result = emptyResult();
    const DATA_START = 6;
    const DATA_END = 25;

    for (let row = DATA_START; row <= DATA_END; row++) {
        const keterangan = String(cell(ws, `B${row}`) ?? "").trim();
        if (!keterangan) continue;

        const pos = String(cell(ws, `C${row}`) ?? "").trim().toUpperCase();
        const amount = parseIDNumber(cell(ws, `D${row}`));
        if (amount === 0) continue;

        // Map POS/DEPARTEMEN to expense account
        let expenseCode = "5899";
        let expenseName = "Beban Lainnya";
        if (pos.includes("BAR") || pos.includes("BEVERAGE")) {
            expenseCode = "5801";
            expenseName = "Beban Bar/Beverage";
        } else if (pos.includes("KITCHEN") || pos.includes("FOOD") || pos.includes("DAPUR")) {
            expenseCode = "5802";
            expenseName = "Beban Kitchen/Food";
        }

        result.entries.push({
            date: new Date(),
            description: keterangan,
            source: "HUTANG_USAHA",
            refNumber: pos || undefined,
            items: [
                { accountCode: expenseCode, accountName: expenseName, debit: round2(amount), credit: 0 },
                { accountCode: "2101", accountName: "Hutang Usaha", debit: 0, credit: round2(amount) },
            ],
            totalDebit: round2(amount),
            totalCredit: round2(amount),
        });
    }

    return result;
}

// ── SHEET 7: HUTANG OWNER ───────────────────────────────────────────────────

export function parseHutangOwner(ws: WorkSheet): SheetResult {
    const result = emptyResult();
    const DATA_START = 6;
    const DATA_END = 25;

    for (let row = DATA_START; row <= DATA_END; row++) {
        const rawDate = cell(ws, `B${row}`);
        const keterangan = String(cell(ws, `C${row}`) ?? "").trim();
        const amount = parseIDNumber(cell(ws, `D${row}`));

        if (!keterangan || amount === 0) continue;

        const dateStr = parseIDDate(rawDate);
        const date = dateStr ? new Date(dateStr) : new Date();

        result.entries.push({
            date,
            description: keterangan,
            source: "HUTANG_OWNER",
            items: [
                { accountCode: "1101", accountName: "Kas/Bank", debit: round2(amount), credit: 0 },
                { accountCode: "3201", accountName: "Modal/Hutang Owner", debit: 0, credit: round2(amount) },
            ],
            totalDebit: round2(amount),
            totalCredit: round2(amount),
        });
    }

    return result;
}

// ── SHEET 8: LABA RUGI ──────────────────────────────────────────────────────

const LABA_RUGI_ROWS: { row: number; label: string; skip?: boolean }[] = [
    { row: 7, label: "Pendapatan Makanan dan Minuman" },
    { row: 8, label: "Pendapatan Lainnya" },
    { row: 9, label: "Discount" },
    { row: 10, label: "Pajak Restaurant (PB1)" },
    { row: 11, label: "JUMLAH PENDAPATAN OPERASIONAL", skip: true },
    { row: 14, label: "HPP Makanan dan Minuman" },
    { row: 15, label: "HPP Lainnya" },
    { row: 16, label: "JUMLAH BEBAN POKOK PENDAPATAN", skip: true },
    { row: 18, label: "LABA RUGI KOTOR", skip: true },
    { row: 21, label: "Beban Tenaga Kerja" },
    { row: 22, label: "Beban Administrasi dan Umum" },
    { row: 23, label: "Beban Penyusutan dan Amortisasi" },
    { row: 24, label: "Beban Lainnya" },
    { row: 25, label: "JUMLAH BEBAN USAHA", skip: true },
    { row: 27, label: "LABA RUGI USAHA", skip: true },
    { row: 30, label: "Pendapatan Non Operasional" },
    { row: 31, label: "Beban Non Operasional" },
    { row: 34, label: "LABA RUGI SEBELUM PAJAK", skip: true },
    { row: 35, label: "Taksiran Pajak Penghasilan" },
    { row: 37, label: "LABA RUGI BERSIH" },
];

export function parseLabaRugi(ws: WorkSheet): SheetResult {
    const result = emptyResult();

    for (const spec of LABA_RUGI_ROWS) {
        if (spec.skip) continue;

        const label = String(cell(ws, `A${spec.row}`) ?? spec.label).trim() || spec.label;
        const currentPeriod = parseIDNumber(cell(ws, `B${spec.row}`));
        const previousPeriod = parseIDNumber(cell(ws, `C${spec.row}`));

        result.financialData.push({ label, currentPeriod, previousPeriod });
    }

    return result;
}

// ── SHEET 9: ARUS KAS ───────────────────────────────────────────────────────

const ARUS_KAS_ROWS: { row: number; label: string; skip?: boolean }[] = [
    { row: 8, label: "Laba Rugi Bersih" },
    { row: 10, label: "Penyusutan Aset Tetap Inventaris" },
    { row: 11, label: "Amortisasi Aset Lain-Lain" },
    { row: 12, label: "Arus kas operasi sblm perub modal kerja", skip: true },
    { row: 14, label: "Piutang Usaha" },
    { row: 15, label: "Piutang Lain Lain" },
    { row: 16, label: "Piutang Afiliasi" },
    { row: 17, label: "Persediaan" },
    { row: 18, label: "Utang Usaha" },
    { row: 19, label: "Utang Lain Lain" },
    { row: 20, label: "Utang Pajak" },
    { row: 21, label: "Utang Afiliasi" },
    { row: 22, label: "Cadangan" },
    { row: 23, label: "Kas bersih aktivitas operasi" },
    { row: 26, label: "Aset Tetap dan Inventaris" },
    { row: 27, label: "Aset Lain Lain" },
    { row: 28, label: "Kas bersih aktivitas investasi" },
    { row: 31, label: "Modal Disetor" },
    { row: 32, label: "Cadangan" },
    { row: 33, label: "Prive" },
    { row: 34, label: "Saldo Laba" },
    { row: 35, label: "Kas bersih aktivitas pendanaan" },
    { row: 37, label: "KENAIKAN BERSIH KAS" },
    { row: 38, label: "KAS AWAL TAHUN" },
    { row: 39, label: "KAS AKHIR TAHUN" },
];

export function parseArusKas(ws: WorkSheet): SheetResult {
    const result = emptyResult();

    for (const spec of ARUS_KAS_ROWS) {
        if (spec.skip) continue;

        const label = String(cell(ws, `A${spec.row}`) ?? spec.label).trim() || spec.label;
        const currentPeriod = parseIDNumber(cell(ws, `B${spec.row}`));
        const previousPeriod = parseIDNumber(cell(ws, `C${spec.row}`));

        result.financialData.push({ label, currentPeriod, previousPeriod });
    }

    return result;
}
