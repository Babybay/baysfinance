/**
 * Auto-Journal Engine
 *
 * Creates journal entries automatically from invoice and payment events.
 * Called from within server actions that already handle auth.
 * All functions take a Prisma transaction client (tx) so callers can
 * wrap payment + journal + status update in one atomic transaction.
 */

import { JournalStatus, Prisma } from "@prisma/client";
import { validateJournalBalance, round2 } from "@/lib/accounting-helpers";
import { updateAccountBalances } from "@/lib/account-balance";

// ── Account code mapping (from seed-accounts.ts) ────────────────────────────

const ACCOUNT_CODES = {
    PIUTANG_USAHA: "120",    // Asset — Piutang Usaha
    BANK: "110",             // Asset — PT Bank for Cashier
    PPN_KELUARAN: "320",     // Liability — PB 1/PHR (PPN Keluaran)
    PENDAPATAN_JASA: "604",  // Revenue — Others Revenue
} as const;

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
async function generateRefNumber(tx: TxClient, date: Date): Promise<string> {
    const dateStr = date.toISOString().slice(0, 7).replace("-", ""); // YYYYMM
    const counterKey = `AJ-${dateStr}`;

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
    return `AJ-${dateStr}-${seq.toString().padStart(4, "0")}`;
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

        const refNumber = await generateRefNumber(tx, invoice.tanggal);
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

        const refNumber = await generateRefNumber(tx, payment.tanggalBayar);
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

        const refNumber = await generateRefNumber(tx, new Date());
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
