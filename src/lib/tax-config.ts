/**
 * Centralized tax configuration for Indonesian tax rates.
 * Change here when government updates rates (e.g., PPN 11% → 12%).
 */
export const TAX_CONFIG = {
    /** PPN (Pajak Pertambahan Nilai) rate — effective April 2022 */
    PPN_RATE: 0.11,
    PPN_LABEL: "PPN 11%",
} as const;
