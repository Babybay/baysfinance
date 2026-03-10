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

    // Using 0.01 to avoid floating point precision issues
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
        return { isValid: false, error: `Total Debit (${totalDebit}) harus sama dengan total Kredit (${totalCredit}). Selisih: ${Math.abs(totalDebit - totalCredit)}` };
    }

    return { isValid: true };
}
