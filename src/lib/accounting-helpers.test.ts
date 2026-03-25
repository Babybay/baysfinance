import { describe, it, expect } from "vitest";
import { round2, roundRupiah, validateJournalBalance } from "./accounting-helpers";

// ── round2 ──────────────────────────────────────────────────────────────────

describe("round2", () => {
    it("rounds to 2 decimal places", () => {
        expect(round2(1.456)).toBe(1.46);
        expect(round2(1.004)).toBe(1);
        expect(round2(0.1 + 0.2)).toBe(0.3);
    });

    it("handles whole numbers", () => {
        expect(round2(100)).toBe(100);
        expect(round2(0)).toBe(0);
    });

    it("handles negative numbers", () => {
        expect(round2(-1.456)).toBe(-1.46);
    });
});

// ── roundRupiah ─────────────────────────────────────────────────────────────

describe("roundRupiah", () => {
    it("rounds to nearest whole number", () => {
        expect(roundRupiah(1100.4)).toBe(1100);
        expect(roundRupiah(1100.5)).toBe(1101);
        expect(roundRupiah(1100.6)).toBe(1101);
    });

    it("PPN calculation rounds correctly", () => {
        // 11% of 1_000_000
        expect(roundRupiah(1_000_000 * 0.11)).toBe(110_000);
        // 11% of 999_999 = 109_999.89
        expect(roundRupiah(999_999 * 0.11)).toBe(110_000);
        // 11% of 123_456 = 13_580.16
        expect(roundRupiah(123_456 * 0.11)).toBe(13580);
    });
});

// ── validateJournalBalance ──────────────────────────────────────────────────

describe("validateJournalBalance", () => {
    it("accepts balanced journal with 2+ items", () => {
        const result = validateJournalBalance([
            { debit: 100, credit: 0 },
            { debit: 0, credit: 100 },
        ]);
        expect(result.isValid).toBe(true);
    });

    it("rejects fewer than 2 items", () => {
        expect(validateJournalBalance([{ debit: 100, credit: 0 }]).isValid).toBe(false);
        expect(validateJournalBalance([]).isValid).toBe(false);
    });

    it("rejects unbalanced journal", () => {
        const result = validateJournalBalance([
            { debit: 100, credit: 0 },
            { debit: 0, credit: 99 },
        ]);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain("Debit");
    });

    it("rejects negative amounts", () => {
        const result = validateJournalBalance([
            { debit: -100, credit: 0 },
            { debit: 0, credit: -100 },
        ]);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain("negatif");
    });

    it("rejects all-zero journal", () => {
        const result = validateJournalBalance([
            { debit: 0, credit: 0 },
            { debit: 0, credit: 0 },
        ]);
        expect(result.isValid).toBe(false);
    });

    it("accepts multi-line balanced journal", () => {
        const result = validateJournalBalance([
            { debit: 1_000_000, credit: 0 },
            { debit: 0, credit: 800_000 },
            { debit: 0, credit: 200_000 },
        ]);
        expect(result.isValid).toBe(true);
    });

    it("tolerates floating-point imprecision within 0.001", () => {
        // 0.1 + 0.2 = 0.30000000000000004
        const result = validateJournalBalance([
            { debit: 0.1 + 0.2, credit: 0 },
            { debit: 0, credit: 0.3 },
        ]);
        expect(result.isValid).toBe(true);
    });
});
