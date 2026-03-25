/**
 * Indonesian Standard Chart of Accounts — Code Ranges
 *
 * These ranges define the account classification used across all financial
 * reports (Neraca Lajur, Neraca, Arus Kas, CALK, etc.).
 *
 * Ranges are designed to encompass all CoA templates (Jasa Konsultan,
 * Hotel & Restoran, Perdagangan, Manufaktur, Konstruksi, Startup/Tech).
 *
 * Code structure:
 *   100-109  Kas                    300-319  Utang Usaha
 *   110-119  Bank                   320-329  Utang Pajak
 *   120-129  Piutang                400-409  Utang Jangka Panjang
 *   130-149  Persediaan             410-419  Cadangan / Uang Muka Pelanggan
 *   210-219  Aset Tetap             510-514  Ekuitas
 *   220-229  Aset Lain-Lain         600-609  Pendapatan Usaha
 *                                   620-629  HPP / Beban Pokok
 *                                   700-729  Beban Operasional
 *                                   900-919  Pendapatan & Beban Non-Operasional
 */
export type CodeRange = [number, number];

export const ACCOUNT_RANGES = {
    // ── ASET ─────────────────────────────────────────────────────────────────
    kas: [[100, 109]] as CodeRange[],
    bank: [[110, 119]] as CodeRange[],
    piutang: [[120, 129]] as CodeRange[],
    persediaan: [[130, 149]] as CodeRange[],
    asetTetap: [[210, 219]] as CodeRange[],   // includes akum. penyusutan
    asetLainLain: [[220, 229]] as CodeRange[], // includes akum. amortisasi, prepaid

    // ── KEWAJIBAN & MODAL ────────────────────────────────────────────────────
    utang: [[300, 319]] as CodeRange[],
    utangPajak: [[320, 329]] as CodeRange[],
    utangJangkaPanjang: [[400, 409]] as CodeRange[],
    cadangan: [[410, 419]] as CodeRange[],
    ekuitas: [[510, 514]] as CodeRange[],

    // ── LABA RUGI ────────────────────────────────────────────────────────────
    pendapatan: [[600, 609], [900, 902]] as CodeRange[],
    hpp: [[620, 629]] as CodeRange[],
    bebanOperasional: [[700, 729]] as CodeRange[],
    bebanNonOperasional: [[910, 919]] as CodeRange[],
    beban: [[620, 629], [700, 729], [910, 919]] as CodeRange[],
} as const;

/**
 * Default contra-asset codes (accumulated depreciation/amortisation).
 * Template-specific overrides are in CoaTemplate.contraAssetCodes.
 *
 * These codes should be shown as negative (parentheses) in reports.
 */
export const CONTRA_ASSET_CODES = new Set([
    "212", "213", "214", "215", "216", "221",
]);

/** Parse the numeric prefix of an account code. */
export function codeToNumber(code: string): number {
    return parseInt(code, 10) || 0;
}

/** Returns true if `code` falls within any of the given ranges. */
export function inRanges(code: string, ranges: CodeRange[]): boolean {
    const n = codeToNumber(code);
    return ranges.some(([min, max]) => n >= min && n <= max);
}
