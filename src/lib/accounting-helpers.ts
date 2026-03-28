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

/**
 * Account direction: Asset & Expense have normal debit balance;
 * Liability, Equity & Revenue have normal credit balance.
 *
 * Returns warnings (not errors) when journal items go against the normal
 * direction for their account type. This catches common data-entry mistakes
 * like crediting an expense account or debiting a revenue account.
 */
export type AccountTypeString = "Asset" | "Liability" | "Equity" | "Revenue" | "Expense";

const NORMAL_DEBIT_TYPES = new Set<AccountTypeString>(["Asset", "Expense"]);

export interface DirectionWarning {
    accountId: string;
    accountName: string;
    accountType: AccountTypeString;
    side: "debit" | "credit";
    amount: number;
    message: string;
}

export function validateAccountDirections(
    items: { accountId: string; debit: number; credit: number }[],
    accountTypeMap: Map<string, { name: string; type: AccountTypeString }>
): DirectionWarning[] {
    const warnings: DirectionWarning[] = [];

    for (const item of items) {
        const acct = accountTypeMap.get(item.accountId);
        if (!acct) continue;

        const isNormalDebit = NORMAL_DEBIT_TYPES.has(acct.type);

        // Asset/Expense credited (unusual — normally debited)
        if (isNormalDebit && item.credit > 0 && item.debit === 0) {
            warnings.push({
                accountId: item.accountId,
                accountName: acct.name,
                accountType: acct.type,
                side: "credit",
                amount: item.credit,
                message: `Akun ${acct.name} (${acct.type}) di-kredit — akun ini normalnya bersaldo debit.`,
            });
        }

        // Liability/Equity/Revenue debited (unusual — normally credited)
        if (!isNormalDebit && item.debit > 0 && item.credit === 0) {
            warnings.push({
                accountId: item.accountId,
                accountName: acct.name,
                accountType: acct.type,
                side: "debit",
                amount: item.debit,
                message: `Akun ${acct.name} (${acct.type}) di-debit — akun ini normalnya bersaldo kredit.`,
            });
        }
    }

    return warnings;
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
