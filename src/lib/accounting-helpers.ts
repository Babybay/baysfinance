/**
 * Safe rounding to 2 decimal places for financial calculations.
 * Avoids IEEE 754 floating-point issues with Math.round(n * 100) / 100.
 */
export function round2(n: number): number {
    return Number(n.toFixed(2));
}

/**
 * Rounds to the nearest whole Rupiah.
 * Indonesian tax invoices use whole numbers (no sen).
 * Use this for PPN calculations and invoice totals to prevent
 * floating-point accumulation errors across many line items.
 */
export function roundRupiah(n: number): number {
    return Math.round(n);
}

export interface JournalEntryItemInput {
    debit: number;
    credit: number;
    accountId?: string;
}

export function validateJournalBalance(items: JournalEntryItemInput[]): { isValid: boolean; error?: string } {
    if (!items || items.length < 2) {
        return { isValid: false, error: "Jurnal minimal harus memiliki 2 baris akun." };
    }

    // Validate no negative amounts
    if (items.some(item => (item.debit || 0) < 0 || (item.credit || 0) < 0)) {
        return { isValid: false, error: "Debit dan Kredit tidak boleh negatif." };
    }

    const totalDebit = items.reduce((sum, item) => sum + (item.debit || 0), 0);
    const totalCredit = items.reduce((sum, item) => sum + (item.credit || 0), 0);

    if (totalDebit <= 0 && totalCredit <= 0) {
        return { isValid: false, error: "Total jurnal harus lebih dari 0." };
    }

    // Using 0.001 tolerance for floating point precision
    if (Math.abs(totalDebit - totalCredit) > 0.001) {
        return { isValid: false, error: `Total Debit (${totalDebit}) harus sama dengan total Kredit (${totalCredit}). Selisih: ${Math.abs(totalDebit - totalCredit)}` };
    }

    return { isValid: true };
}
