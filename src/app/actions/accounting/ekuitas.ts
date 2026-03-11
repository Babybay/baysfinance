"use server";

import { prisma } from "@/lib/prisma";
import { JournalStatus, AccountType } from "@prisma/client";
import { assertCanAccessClient, handleAuthError } from "@/lib/auth-helpers";
import { ACCOUNT_RANGES, inRanges } from "@/lib/accounting/account-ranges";

// ── Types ────────────────────────────────────────────────────────────────────

/** One row in the statement of changes in equity. */
export interface EkuitasRow {
    label: string;
    modalDisetor: number;   // 510
    cadangan: number;       // 511
    prive: number;          // 512
    saldoLaba: number;      // 513
    labaBerjalan: number;   // 514 / computed
    total: number;
    isBold?: boolean;
}

export interface EkuitasData {
    clientId: string;
    clientName: string;
    startDate: string;
    endDate: string;
    rows: EkuitasRow[];
}

// ── Equity column definitions ────────────────────────────────────────────────
// Each column is tied to one or more account codes.

type EqCol = "modalDisetor" | "cadangan" | "prive" | "saldoLaba" | "labaBerjalan";

const COLUMN_CODES: Record<EqCol, string[]> = {
    modalDisetor: ["510"],
    cadangan: ["511"],
    prive: ["512"],
    saldoLaba: ["513"],
    labaBerjalan: ["514"],
};

// ── Server Action ────────────────────────────────────────────────────────────

export async function getEkuitas(
    clientId: string,
    startDate: Date,
    endDate: Date
): Promise<{ success: boolean; data?: EkuitasData; error?: string }> {
    try {
        await assertCanAccessClient(clientId);

        if (endDate < startDate) {
            return { success: false, error: "Tanggal akhir harus setelah tanggal awal." };
        }

        const client = await prisma.client.findUnique({
            where: { id: clientId },
            select: { id: true, nama: true },
        });
        if (!client) return { success: false, error: "Klien tidak ditemukan." };

        // Fetch all equity accounts + revenue/expense for P&L computation
        const accounts = await prisma.account.findMany({
            where: {
                OR: [{ clientId: null }, { clientId }],
                isActive: true,
            },
            select: { id: true, code: true, name: true, type: true },
        });

        const accountById = new Map(accounts.map((a) => [a.id, a]));
        const accountIds = accounts.map((a) => a.id);

        // ── Opening balances (all posted items BEFORE startDate) ─────────
        const openingItems = await prisma.journalItem.findMany({
            where: {
                accountId: { in: accountIds },
                journalEntry: {
                    clientId,
                    status: JournalStatus.Posted,
                    deletedAt: null,
                    date: { lt: startDate },
                },
            },
            select: { accountId: true, debit: true, credit: true },
        });

        // ── Period items (startDate to endDate) ──────────────────────────
        const periodItems = await prisma.journalItem.findMany({
            where: {
                accountId: { in: accountIds },
                journalEntry: {
                    clientId,
                    status: JournalStatus.Posted,
                    deletedAt: null,
                    date: { gte: startDate, lte: endDate },
                },
            },
            select: { accountId: true, debit: true, credit: true },
        });

        // Aggregate opening balances per account code (credit - debit for equity)
        const openingByCode = new Map<string, number>();
        for (const item of openingItems) {
            const acct = accountById.get(item.accountId);
            if (!acct) continue;
            const prev = openingByCode.get(acct.code) || 0;
            openingByCode.set(
                acct.code,
                prev + Number(item.credit) - Number(item.debit)
            );
        }

        // Aggregate period movements per account code
        const periodDebitByCode = new Map<string, number>();
        const periodCreditByCode = new Map<string, number>();
        for (const item of periodItems) {
            const acct = accountById.get(item.accountId);
            if (!acct) continue;
            periodDebitByCode.set(
                acct.code,
                (periodDebitByCode.get(acct.code) || 0) + Number(item.debit)
            );
            periodCreditByCode.set(
                acct.code,
                (periodCreditByCode.get(acct.code) || 0) + Number(item.credit)
            );
        }

        // ── Compute net income (Laba Rugi) for the period ────────────────
        // Revenue (credit-normal) - Expenses (debit-normal) for the period
        let periodRevenue = 0;
        let periodExpenses = 0;
        for (const item of periodItems) {
            const acct = accountById.get(item.accountId);
            if (!acct) continue;
            if (acct.type === AccountType.Revenue) {
                periodRevenue += Number(item.credit) - Number(item.debit);
            } else if (acct.type === AccountType.Expense) {
                periodExpenses += Number(item.debit) - Number(item.credit);
            }
        }
        const netIncome = periodRevenue - periodExpenses;

        // ── Helper: sum opening balance for codes in a column ────────────
        const colOpening = (col: EqCol): number => {
            return COLUMN_CODES[col].reduce(
                (sum, code) => sum + (openingByCode.get(code) || 0),
                0
            );
        };

        // Period net credit (additions) for a column
        const colPeriodCredit = (col: EqCol): number => {
            return COLUMN_CODES[col].reduce(
                (sum, code) => sum + (periodCreditByCode.get(code) || 0),
                0
            );
        };

        // Period net debit (reductions) for a column
        const colPeriodDebit = (col: EqCol): number => {
            return COLUMN_CODES[col].reduce(
                (sum, code) => sum + (periodDebitByCode.get(code) || 0),
                0
            );
        };

        // ── Build matrix rows ────────────────────────────────────────────

        const makeRow = (
            label: string,
            vals: Record<EqCol, number>,
            isBold = false
        ): EkuitasRow => {
            const total =
                vals.modalDisetor + vals.cadangan + vals.prive + vals.saldoLaba + vals.labaBerjalan;
            return { label, ...vals, total, isBold };
        };

        // 1. Opening balance
        const opening = makeRow("Saldo Awal", {
            modalDisetor: colOpening("modalDisetor"),
            cadangan: colOpening("cadangan"),
            prive: colOpening("prive"),
            saldoLaba: colOpening("saldoLaba"),
            labaBerjalan: colOpening("labaBerjalan"),
        });

        // 2. Additions to capital (new credits to Modal Disetor during period)
        const penambahanModal = makeRow("Penambahan Modal", {
            modalDisetor: colPeriodCredit("modalDisetor") - colPeriodDebit("modalDisetor"),
            cadangan: colPeriodCredit("cadangan") - colPeriodDebit("cadangan"),
            prive: 0,
            saldoLaba: 0,
            labaBerjalan: 0,
        });

        // 3. Net Income → flows into Laba Berjalan column
        const labaRugi = makeRow("Laba/Rugi Tahun Ini", {
            modalDisetor: 0,
            cadangan: 0,
            prive: 0,
            saldoLaba: 0,
            labaBerjalan: netIncome,
        });

        // 4. Dividends / Prive (debits to Prive 512 or Saldo Laba 513 during period)
        const dividenPrive = makeRow("Dividen / Prive", {
            modalDisetor: 0,
            cadangan: 0,
            prive: colPeriodCredit("prive") - colPeriodDebit("prive"),
            saldoLaba: colPeriodCredit("saldoLaba") - colPeriodDebit("saldoLaba"),
            labaBerjalan: 0,
        });

        // 5. Closing balance = Opening + all movements
        const closing = makeRow(
            "Saldo Akhir",
            {
                modalDisetor: opening.modalDisetor + penambahanModal.modalDisetor,
                cadangan: opening.cadangan + penambahanModal.cadangan,
                prive: opening.prive + dividenPrive.prive,
                saldoLaba: opening.saldoLaba + dividenPrive.saldoLaba,
                labaBerjalan: opening.labaBerjalan + labaRugi.labaBerjalan,
            },
            true
        );

        return {
            success: true,
            data: {
                clientId: client.id,
                clientName: client.nama,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                rows: [opening, penambahanModal, labaRugi, dividenPrive, closing],
            },
        };
    } catch (error) {
        console.error("[getEkuitas]", error);
        if (error instanceof Error && (error.message === "UNAUTHENTICATED" || error.message === "FORBIDDEN")) {
            return handleAuthError(error);
        }
        return { success: false, error: "Gagal memuat data ekuitas." };
    }
}
