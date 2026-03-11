/**
 * Indonesian Standard Chart of Accounts — Code Ranges
 *
 * These ranges define the account classification used across all financial
 * reports (Neraca Lajur, Neraca, Arus Kas, CALK, etc.).
 *
 * They follow the standard hotel/restaurant chart of accounts structure
 * mandated for Indonesian tax reporting purposes.
 *
 * To customise per-client in the future, accept a config object in the
 * functions that consume these ranges instead of importing this constant.
 */
export type CodeRange = [number, number];

export const ACCOUNT_RANGES = {
    // ── ASET ─────────────────────────────────────────────────────────────────
    kas: [[100, 101]] as CodeRange[],
    bank: [[110, 114]] as CodeRange[],
    piutang: [[120, 122]] as CodeRange[],
    persediaan: [[130, 140]] as CodeRange[],
    asetTetap: [[210, 213]] as CodeRange[],   // includes akum. penyusutan (212, 213)
    asetLainLain: [[220, 223]] as CodeRange[], // includes akum. amortisasi (221)

    // ── KEWAJIBAN & MODAL ────────────────────────────────────────────────────
    utang: [[300, 310]] as CodeRange[],
    utangPajak: [[320, 321]] as CodeRange[],   // 321 = Utang Pajak Penghasilan
    utangAfiliasi: [[400, 400]] as CodeRange[],
    cadangan: [[410, 410]] as CodeRange[],
    ekuitas: [[510, 514]] as CodeRange[],      // 514 = Laba Tahun Berjalan

    // ── LABA RUGI ────────────────────────────────────────────────────────────
    pendapatan: [[600, 606], [900, 902]] as CodeRange[],
    beban: [[620, 624], [700, 729], [910, 913]] as CodeRange[],
} as const;

/**
 * Contra-asset accounts — always shown as negative (parentheses) in reports.
 * These hold accumulated depreciation / amortisation balances.
 */
export const CONTRA_ASSET_CODES = new Set(["212", "213", "221"]);

/** Parse the numeric prefix of an account code. */
export function codeToNumber(code: string): number {
    return parseInt(code, 10) || 0;
}

/** Returns true if `code` falls within any of the given ranges. */
export function inRanges(code: string, ranges: CodeRange[]): boolean {
    const n = codeToNumber(code);
    return ranges.some(([min, max]) => n >= min && n <= max);
}
