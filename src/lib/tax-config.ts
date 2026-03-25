/**
 * Centralized tax configuration for Indonesian tax rates.
 * Change here when government updates rates (e.g., PPN 11% → 12%).
 */
export const TAX_CONFIG = {
    /** PPN (Pajak Pertambahan Nilai) rate — effective April 2022 */
    PPN_RATE: 0.11,
    PPN_LABEL: "PPN 11%",
} as const;

/**
 * PPh (Pajak Penghasilan) withholding rates used in expense recording.
 */
export const PPH_RATES: Record<string, { label: string; rate: number; accountCode: string }> = {
    PPh21: { label: "PPh 21 (Gaji/Honorarium)", rate: 0.05, accountCode: "321" },
    PPh23: { label: "PPh 23 (Jasa/Sewa)", rate: 0.02, accountCode: "322" },
    "PPh4(2)": { label: "PPh 4(2) (Final)", rate: 0.10, accountCode: "323" },
};

/**
 * Standard account codes used by auto-journal engine.
 * These correspond to the COA templates in coa-templates.ts.
 */
export const STANDARD_ACCOUNTS = {
    PIUTANG_USAHA: "120",
    BANK: "110",
    KAS: "100",
    PPN_KELUARAN: "320",
    PPN_MASUKAN: "321",
    HUTANG_USAHA: "300",
    PENDAPATAN_JASA: "604",
    SALDO_LABA: "513",
    AKUM_PENYUSUTAN: "212",
    BEBAN_PENYUSUTAN: "708",
} as const;
