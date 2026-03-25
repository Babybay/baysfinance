/**
 * Auto-Journal Engine
 *
 * Creates journal entries automatically from invoice, payment, expense,
 * and depreciation events.
 * Called from within server actions that already handle auth.
 * All functions take a Prisma transaction client (tx) so callers can
 * wrap payment + journal + status update in one atomic transaction.
 */

import { JournalStatus, Prisma } from "@prisma/client";
import { validateJournalBalance, round2 } from "@/lib/accounting-helpers";
import { updateAccountBalances } from "@/lib/account-balance";
import { STANDARD_ACCOUNTS, PPH_RATES } from "@/lib/tax-config";

// ── Account code mapping ────────────────────────────────────────────────────

const ACCOUNT_CODES = STANDARD_ACCOUNTS;

// ── Types ────────────────────────────────────────────────────────────────────

export interface AutoJournalResult {
    success: boolean;
    journalEntryId?: string;
    refNumber?: string;
    error?: string;
}

interface InvoiceForJournal {
    id: string;
    nomorInvoice: string;
    clientId: string;
    subtotal: number;
    ppn: number;
    total: number;
    tanggal: Date;
}

interface PaymentForJournal {
    id: string;
    jumlah: number;
    tanggalBayar: Date;
}

interface InvoiceRef {
    nomorInvoice: string;
    clientId: string;
}

interface ExpenseForJournal {
    id: string;
    nomorBukti: string;
    clientId: string;
    tanggal: Date;
    deskripsi: string;
    jumlah: number;
    expenseAccountCode: string;
    bankAccountCode: string;
    isPaid: boolean;
    pphType?: string | null;
    pphRate?: number | null;
    pphAmount?: number | null;
    netAmount?: number | null;
}

interface DepreciationForJournal {
    clientId: string;
    period: string;       // "2026-03"
    totalAmount: number;
    date: Date;
}

// Prisma transaction client type — works with extended client
type TxClient = Parameters<Parameters<typeof import("@/lib/prisma").prisma.$transaction>[0]>[0];

// ── Account Resolution ───────────────────────────────────────────────────────

/**
 * Resolve account IDs by code for a given client.
 * Searches client-specific accounts first, then shared (clientId=null).
 */
async function resolveAccounts(
    tx: TxClient,
    clientId: string,
    requiredCodes: string[]
): Promise<{ accountMap: Map<string, string>; missing: string[] }> {
    const accounts = await (tx as any).account.findMany({
        where: {
            code: { in: requiredCodes },
            OR: [{ clientId: null }, { clientId }],
            isActive: true,
        },
        select: { id: true, code: true, clientId: true },
    });

    // Prioritize client-specific over shared
    const accountMap = new Map<string, string>();
    for (const acc of accounts) {
        const existing = accountMap.get(acc.code);
        if (!existing || acc.clientId === clientId) {
            accountMap.set(acc.code, acc.id);
        }
    }

    const missing = requiredCodes.filter((code) => !accountMap.has(code));
    return { accountMap, missing };
}

// ── Atomic Reference Number ──────────────────────────────────────────────────

/**
 * Generate atomic ref number within an existing transaction.
 * Pattern: AJ-YYYYMM-0001
 */
async function generateRefNumber(tx: TxClient, prefix: string, date: Date): Promise<string> {
    const dateStr = date.toISOString().slice(0, 7).replace("-", ""); // YYYYMM
    const counterKey = `${prefix}-${dateStr}`;

    const rows: [{ counter: number }] = await (tx as any).$queryRaw(
        Prisma.sql`
            INSERT INTO permit_counters (id, counter)
            VALUES (${counterKey}, 1)
            ON CONFLICT (id) DO UPDATE
                SET counter = permit_counters.counter + 1
            RETURNING counter
        `
    );
    const seq = rows[0].counter;
    return `${prefix}-${dateStr}-${seq.toString().padStart(4, "0")}`;
}

// ── Invoice Sent Journal ─────────────────────────────────────────────────────

/**
 * Create journal entry when invoice is marked Terkirim.
 *
 *   Debit  120 Piutang Usaha     = invoice.total
 *   Credit 604 Pendapatan Jasa   = invoice.subtotal
 *   Credit 320 PPN Keluaran      = invoice.ppn
 */
export async function createInvoiceSentJournal(
    tx: TxClient,
    invoice: InvoiceForJournal
): Promise<AutoJournalResult> {
    try {
        // Duplicate check
        const existing = await (tx as any).journalEntry.findFirst({
            where: {
                clientId: invoice.clientId,
                source: "auto_invoice",
                description: { contains: invoice.nomorInvoice },
                deletedAt: null,
            },
            select: { id: true, refNumber: true },
        });
        if (existing) {
            return { success: true, journalEntryId: existing.id, refNumber: existing.refNumber };
        }

        // Resolve accounts
        const codes = [ACCOUNT_CODES.PIUTANG_USAHA, ACCOUNT_CODES.PENDAPATAN_JASA, ACCOUNT_CODES.PPN_KELUARAN];
        const { accountMap, missing } = await resolveAccounts(tx, invoice.clientId, codes);
        if (missing.length > 0) {
            return {
                success: false,
                error: `Akun ${missing.join(", ")} belum ada untuk klien ini. Jalankan seed akun terlebih dahulu.`,
            };
        }

        const totalDebit = round2(invoice.total);
        const creditPendapatan = round2(invoice.subtotal);
        const creditPPN = round2(invoice.ppn);

        const items = [
            { accountId: accountMap.get(ACCOUNT_CODES.PIUTANG_USAHA)!, debit: totalDebit, credit: 0 },
            { accountId: accountMap.get(ACCOUNT_CODES.PENDAPATAN_JASA)!, debit: 0, credit: creditPendapatan },
            { accountId: accountMap.get(ACCOUNT_CODES.PPN_KELUARAN)!, debit: 0, credit: creditPPN },
        ];

        // Validate balance
        const validation = validateJournalBalance(items);
        if (!validation.isValid) {
            return { success: false, error: validation.error };
        }

        const refNumber = await generateRefNumber(tx, "AJ", invoice.tanggal);
        const description = `Penjualan jasa - ${invoice.nomorInvoice}`;

        const entry = await (tx as any).journalEntry.create({
            data: {
                refNumber,
                date: invoice.tanggal,
                description,
                status: JournalStatus.Posted,
                clientId: invoice.clientId,
                totalDebit,
                totalCredit: round2(creditPendapatan + creditPPN),
                source: "auto_invoice",
                items: {
                    create: items.map((item) => ({
                        accountId: item.accountId,
                        debit: item.debit,
                        credit: item.credit,
                    })),
                },
            },
        });

        await updateAccountBalances(tx, invoice.clientId, items);

        return { success: true, journalEntryId: entry.id, refNumber };
    } catch (error) {
        console.error("[createInvoiceSentJournal]", error);
        return { success: false, error: "Gagal membuat jurnal otomatis untuk invoice." };
    }
}

// ── Invoice Reversal Journal ─────────────────────────────────────────────────

/**
 * Create reversing journal for an invoice (when voided/deleted after Terkirim).
 *
 *   Debit  604 Pendapatan Jasa   = invoice.subtotal
 *   Debit  320 PPN Keluaran      = invoice.ppn
 *   Credit 120 Piutang Usaha     = invoice.total
 */
export async function createInvoiceReversalJournal(
    tx: TxClient,
    invoice: InvoiceForJournal
): Promise<AutoJournalResult> {
    try {
        const codes = [ACCOUNT_CODES.PIUTANG_USAHA, ACCOUNT_CODES.PENDAPATAN_JASA, ACCOUNT_CODES.PPN_KELUARAN];
        const { accountMap, missing } = await resolveAccounts(tx, invoice.clientId, codes);
        if (missing.length > 0) {
            return { success: false, error: `Akun ${missing.join(", ")} belum ada.` };
        }

        // Find original journal to link
        const originalJournal = await (tx as any).journalEntry.findFirst({
            where: {
                clientId: invoice.clientId,
                source: "auto_invoice",
                description: { contains: invoice.nomorInvoice },
                deletedAt: null,
            },
            select: { id: true },
        });

        const totalCredit = round2(invoice.total);
        const debitPendapatan = round2(invoice.subtotal);
        const debitPPN = round2(invoice.ppn);

        const items = [
            { accountId: accountMap.get(ACCOUNT_CODES.PENDAPATAN_JASA)!, debit: debitPendapatan, credit: 0 },
            { accountId: accountMap.get(ACCOUNT_CODES.PPN_KELUARAN)!, debit: debitPPN, credit: 0 },
            { accountId: accountMap.get(ACCOUNT_CODES.PIUTANG_USAHA)!, debit: 0, credit: totalCredit },
        ];

        const refNumber = await generateRefNumber(tx, "AJ", new Date());
        const description = `Pembatalan invoice - ${invoice.nomorInvoice}`;

        const entry = await (tx as any).journalEntry.create({
            data: {
                refNumber,
                date: new Date(),
                description,
                status: JournalStatus.Posted,
                clientId: invoice.clientId,
                totalDebit: round2(debitPendapatan + debitPPN),
                totalCredit: totalCredit,
                source: "auto_invoice_reversal",
                relatedEntryId: originalJournal?.id || null,
                items: {
                    create: items.map((item) => ({
                        accountId: item.accountId,
                        debit: item.debit,
                        credit: item.credit,
                    })),
                },
            },
        });

        await updateAccountBalances(tx, invoice.clientId, items);

        return { success: true, journalEntryId: entry.id, refNumber };
    } catch (error) {
        console.error("[createInvoiceReversalJournal]", error);
        return { success: false, error: "Gagal membuat jurnal pembalik invoice." };
    }
}

// ── Payment Received Journal ─────────────────────────────────────────────────

/**
 * Create journal entry when payment is recorded.
 *
 *   Debit  110 Bank             = payment.jumlah
 *   Credit 120 Piutang Usaha   = payment.jumlah
 */
export async function createPaymentReceivedJournal(
    tx: TxClient,
    payment: PaymentForJournal,
    invoice: InvoiceRef
): Promise<AutoJournalResult> {
    try {
        // Duplicate check — idempotent if called twice for same payment
        const existing = await (tx as any).journalEntry.findFirst({
            where: {
                clientId: invoice.clientId,
                source: "auto_payment",
                description: { contains: payment.id },
                deletedAt: null,
            },
            select: { id: true, refNumber: true },
        });
        if (existing) {
            return { success: true, journalEntryId: existing.id, refNumber: existing.refNumber };
        }

        // Resolve accounts
        const codes = [ACCOUNT_CODES.BANK, ACCOUNT_CODES.PIUTANG_USAHA];
        const { accountMap, missing } = await resolveAccounts(tx, invoice.clientId, codes);
        if (missing.length > 0) {
            return {
                success: false,
                error: `Akun ${missing.join(", ")} belum ada untuk klien ini. Jalankan seed akun terlebih dahulu.`,
            };
        }

        const amount = round2(payment.jumlah);

        const items = [
            { accountId: accountMap.get(ACCOUNT_CODES.BANK)!, debit: amount, credit: 0 },
            { accountId: accountMap.get(ACCOUNT_CODES.PIUTANG_USAHA)!, debit: 0, credit: amount },
        ];

        const validation = validateJournalBalance(items);
        if (!validation.isValid) {
            return { success: false, error: validation.error };
        }

        const refNumber = await generateRefNumber(tx, "AJ", payment.tanggalBayar);
        const description = `Penerimaan pembayaran - ${invoice.nomorInvoice} (${payment.id})`;

        const entry = await (tx as any).journalEntry.create({
            data: {
                refNumber,
                date: payment.tanggalBayar,
                description,
                status: JournalStatus.Posted,
                clientId: invoice.clientId,
                totalDebit: amount,
                totalCredit: amount,
                source: "auto_payment",
                items: {
                    create: items.map((item) => ({
                        accountId: item.accountId,
                        debit: item.debit,
                        credit: item.credit,
                    })),
                },
            },
        });

        await updateAccountBalances(tx, invoice.clientId, items);

        return { success: true, journalEntryId: entry.id, refNumber };
    } catch (error) {
        console.error("[createPaymentReceivedJournal]", error);
        return { success: false, error: "Gagal membuat jurnal otomatis untuk pembayaran." };
    }
}

// ── Payment Reversal Journal ─────────────────────────────────────────────────

/**
 * Create reversing journal entry when a payment is deleted.
 *
 *   Debit  120 Piutang Usaha   = payment.jumlah  (reverse of original)
 *   Credit 110 Bank            = payment.jumlah
 */
export async function createPaymentReversalJournal(
    tx: TxClient,
    payment: PaymentForJournal,
    invoice: InvoiceRef
): Promise<AutoJournalResult> {
    try {
        const codes = [ACCOUNT_CODES.BANK, ACCOUNT_CODES.PIUTANG_USAHA];
        const { accountMap, missing } = await resolveAccounts(tx, invoice.clientId, codes);
        if (missing.length > 0) {
            return {
                success: false,
                error: `Akun ${missing.join(", ")} belum ada untuk klien ini.`,
            };
        }

        // Find the original payment journal to link the reversal
        const originalJournal = await (tx as any).journalEntry.findFirst({
            where: {
                clientId: invoice.clientId,
                source: "auto_payment",
                description: { contains: payment.id },
                deletedAt: null,
            },
            select: { id: true },
        });

        if (!originalJournal) {
            console.warn(
                `[createPaymentReversalJournal] Original journal not found for payment ${payment.id} — reversal will be created without link.`
            );
        }

        const amount = round2(payment.jumlah);

        const items = [
            { accountId: accountMap.get(ACCOUNT_CODES.PIUTANG_USAHA)!, debit: amount, credit: 0 },
            { accountId: accountMap.get(ACCOUNT_CODES.BANK)!, debit: 0, credit: amount },
        ];

        const refNumber = await generateRefNumber(tx, "AJ", new Date());
        const description = `Pembatalan pembayaran - ${invoice.nomorInvoice} (${payment.id})`;

        const entry = await (tx as any).journalEntry.create({
            data: {
                refNumber,
                date: new Date(),
                description,
                status: JournalStatus.Posted,
                clientId: invoice.clientId,
                totalDebit: amount,
                totalCredit: amount,
                source: "auto_payment_reversal",
                relatedEntryId: originalJournal?.id || null,
                items: {
                    create: items.map((item) => ({
                        accountId: item.accountId,
                        debit: item.debit,
                        credit: item.credit,
                    })),
                },
            },
        });

        await updateAccountBalances(tx, invoice.clientId, items);

        return { success: true, journalEntryId: entry.id, refNumber };
    } catch (error) {
        console.error("[createPaymentReversalJournal]", error);
        return { success: false, error: "Gagal membuat jurnal pembalik pembayaran." };
    }
}

// ── Expense Journal ──────────────────────────────────────────────────────────

/**
 * Create journal entry when expense is recorded.
 *
 * Paid expense:
 *   Debit  [ExpenseAccount]    = jumlah
 *   Credit [BankAccount]       = netAmount (jumlah - pphAmount)
 *   Credit [PPh Payable]       = pphAmount (if withholding)
 *
 * Unpaid expense (AP):
 *   Debit  [ExpenseAccount]    = jumlah
 *   Credit 300 Hutang Usaha    = netAmount
 *   Credit [PPh Payable]       = pphAmount (if withholding)
 */
export async function createExpenseJournal(
    tx: TxClient,
    expense: ExpenseForJournal
): Promise<AutoJournalResult> {
    try {
        // Duplicate check
        const existing = await (tx as any).journalEntry.findFirst({
            where: {
                clientId: expense.clientId,
                source: "auto_expense",
                description: { contains: expense.nomorBukti },
                deletedAt: null,
            },
            select: { id: true, refNumber: true },
        });
        if (existing) {
            return { success: true, journalEntryId: existing.id, refNumber: existing.refNumber };
        }

        // Determine required accounts
        const creditAccountCode = expense.isPaid
            ? expense.bankAccountCode
            : ACCOUNT_CODES.HUTANG_USAHA;

        const requiredCodes = [expense.expenseAccountCode, creditAccountCode];

        // Add PPh payable account if withholding applies
        let pphAccountCode: string | null = null;
        if (expense.pphType && expense.pphAmount && expense.pphAmount > 0) {
            const pphConfig = PPH_RATES[expense.pphType];
            if (pphConfig) {
                pphAccountCode = pphConfig.accountCode;
                requiredCodes.push(pphAccountCode);
            }
        }

        const { accountMap, missing } = await resolveAccounts(tx, expense.clientId, requiredCodes);
        if (missing.length > 0) {
            return {
                success: false,
                error: `Akun ${missing.join(", ")} belum ada untuk klien ini. Jalankan seed akun terlebih dahulu.`,
            };
        }

        const totalAmount = round2(expense.jumlah);
        const pphAmount = round2(expense.pphAmount || 0);
        const netAmount = round2(totalAmount - pphAmount);

        const items: { accountId: string; debit: number; credit: number }[] = [
            { accountId: accountMap.get(expense.expenseAccountCode)!, debit: totalAmount, credit: 0 },
            { accountId: accountMap.get(creditAccountCode)!, debit: 0, credit: netAmount },
        ];

        if (pphAccountCode && pphAmount > 0) {
            items.push({
                accountId: accountMap.get(pphAccountCode)!,
                debit: 0,
                credit: pphAmount,
            });
        }

        const validation = validateJournalBalance(items);
        if (!validation.isValid) {
            return { success: false, error: validation.error };
        }

        const refNumber = await generateRefNumber(tx, "AJ", expense.tanggal);
        const description = `Beban - ${expense.deskripsi} (${expense.nomorBukti})`;

        const entry = await (tx as any).journalEntry.create({
            data: {
                refNumber,
                date: expense.tanggal,
                description,
                status: JournalStatus.Posted,
                clientId: expense.clientId,
                totalDebit: totalAmount,
                totalCredit: totalAmount,
                source: "auto_expense",
                items: {
                    create: items.map((item) => ({
                        accountId: item.accountId,
                        debit: item.debit,
                        credit: item.credit,
                    })),
                },
            },
        });

        await updateAccountBalances(tx, expense.clientId, items);

        return { success: true, journalEntryId: entry.id, refNumber };
    } catch (error) {
        console.error("[createExpenseJournal]", error);
        return { success: false, error: "Gagal membuat jurnal otomatis untuk beban." };
    }
}

// ── Depreciation Journal ─────────────────────────────────────────────────────

/**
 * Create monthly depreciation journal entry from FixedAsset data.
 *
 *   Debit  708 Beban Penyusutan        = totalAmount
 *   Credit 212 Akumulasi Penyusutan    = totalAmount
 */
export async function createDepreciationJournal(
    tx: TxClient,
    data: DepreciationForJournal
): Promise<AutoJournalResult> {
    try {
        // Duplicate check
        const existing = await (tx as any).journalEntry.findFirst({
            where: {
                clientId: data.clientId,
                source: "auto_depreciation",
                description: { contains: data.period },
                deletedAt: null,
            },
            select: { id: true, refNumber: true },
        });
        if (existing) {
            return { success: true, journalEntryId: existing.id, refNumber: existing.refNumber };
        }

        const codes = [ACCOUNT_CODES.BEBAN_PENYUSUTAN, ACCOUNT_CODES.AKUM_PENYUSUTAN];
        const { accountMap, missing } = await resolveAccounts(tx, data.clientId, codes);
        if (missing.length > 0) {
            return {
                success: false,
                error: `Akun ${missing.join(", ")} belum ada untuk klien ini. Jalankan seed akun terlebih dahulu.`,
            };
        }

        const amount = round2(data.totalAmount);
        if (amount <= 0) {
            return { success: false, error: "Total penyusutan harus lebih dari 0." };
        }

        const items = [
            { accountId: accountMap.get(ACCOUNT_CODES.BEBAN_PENYUSUTAN)!, debit: amount, credit: 0 },
            { accountId: accountMap.get(ACCOUNT_CODES.AKUM_PENYUSUTAN)!, debit: 0, credit: amount },
        ];

        const refNumber = await generateRefNumber(tx, "AJ", data.date);
        const description = `Penyusutan aset tetap periode ${data.period}`;

        const entry = await (tx as any).journalEntry.create({
            data: {
                refNumber,
                date: data.date,
                description,
                status: JournalStatus.Posted,
                clientId: data.clientId,
                totalDebit: amount,
                totalCredit: amount,
                source: "auto_depreciation",
                items: {
                    create: items.map((item) => ({
                        accountId: item.accountId,
                        debit: item.debit,
                        credit: item.credit,
                    })),
                },
            },
        });

        await updateAccountBalances(tx, data.clientId, items);

        return { success: true, journalEntryId: entry.id, refNumber };
    } catch (error) {
        console.error("[createDepreciationJournal]", error);
        return { success: false, error: "Gagal membuat jurnal penyusutan." };
    }
}
