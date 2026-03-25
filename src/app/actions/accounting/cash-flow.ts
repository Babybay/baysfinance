"use server";

import { prisma } from "@/lib/prisma";
import { JournalStatus } from "@prisma/client";
import { assertCanAccessClient, handleAuthError } from "@/lib/auth-helpers";
import { ACCOUNT_RANGES } from "@/lib/accounting/account-ranges";
import { createLogger } from "@/lib/logger";

const log = createLogger("cash-flow");

function codeToNum(code: string): number {
    return parseInt(code, 10) || 0;
}

function inRanges(code: string, ranges: number[][]): boolean {
    const num = codeToNum(code);
    return ranges.some(([min, max]) => num >= min && num <= max);
}

/**
 * Cash Flow Statement (Laporan Arus Kas) — Direct Method
 *
 * Classifies all journal entries that touch cash/bank accounts (100-119)
 * into Operating, Investing, and Financing activities based on the
 * contra-account in each journal.
 */
export async function getCashFlowReport(
    clientId: string,
    startDate: Date,
    endDate: Date
) {
    try {
        await assertCanAccessClient(clientId);

        // Get all cash/bank account codes for this client
        const cashBankAccounts = await prisma.account.findMany({
            where: {
                isActive: true,
                OR: [{ clientId: null }, { clientId }],
            },
            select: { id: true, code: true, name: true },
        });

        const cashBankIds = new Set(
            cashBankAccounts
                .filter((a) => inRanges(a.code, [...ACCOUNT_RANGES.kas, ...ACCOUNT_RANGES.bank]))
                .map((a) => a.id)
        );

        const accountCodeMap = new Map(cashBankAccounts.map((a) => [a.id, a.code]));
        const accountNameMap = new Map(cashBankAccounts.map((a) => [a.id, a.name]));

        // Get all posted journal entries in the period
        const journals = await prisma.journalEntry.findMany({
            where: {
                clientId,
                status: JournalStatus.Posted,
                date: { gte: startDate, lte: endDate },
                deletedAt: null,
            },
            include: {
                items: {
                    select: { accountId: true, debit: true, credit: true },
                },
            },
            orderBy: { date: "asc" },
        });

        // For each journal that has a cash/bank line, classify the cash movement
        const operating: { description: string; amount: number }[] = [];
        const investing: { description: string; amount: number }[] = [];
        const financing: { description: string; amount: number }[] = [];

        for (const journal of journals) {
            const cashItems = journal.items.filter((item) => cashBankIds.has(item.accountId));
            if (cashItems.length === 0) continue;

            // Net cash movement from this journal (debit - credit on cash accounts)
            const cashMovement = cashItems.reduce(
                (sum, item) => sum + (Number(item.debit) - Number(item.credit)),
                0
            );
            if (Math.abs(cashMovement) < 0.01) continue;

            // Determine category from contra-accounts (non-cash items in same journal)
            const contraItems = journal.items.filter((item) => !cashBankIds.has(item.accountId));
            const contraCode = contraItems.length > 0 ? accountCodeMap.get(contraItems[0].accountId) || "" : "";
            const contraNum = codeToNum(contraCode);

            const entry = {
                description: journal.description || journal.refNumber,
                amount: Math.round(cashMovement * 100) / 100,
            };

            if (
                // Fixed assets (210-229)
                inRanges(contraCode, ACCOUNT_RANGES.asetTetap) ||
                inRanges(contraCode, ACCOUNT_RANGES.asetLainLain)
            ) {
                investing.push(entry);
            } else if (
                // Equity (510-514) or long-term liabilities (400-409)
                inRanges(contraCode, ACCOUNT_RANGES.ekuitas) ||
                (contraNum >= 400 && contraNum <= 409)
            ) {
                financing.push(entry);
            } else {
                // Revenue, expense, receivables, payables, tax — operating
                operating.push(entry);
            }
        }

        const totalOperating = operating.reduce((s, e) => s + e.amount, 0);
        const totalInvesting = investing.reduce((s, e) => s + e.amount, 0);
        const totalFinancing = financing.reduce((s, e) => s + e.amount, 0);
        const netCashChange = totalOperating + totalInvesting + totalFinancing;

        // Opening cash balance (cumulative up to startDate - 1 day)
        const dayBefore = new Date(startDate);
        dayBefore.setDate(dayBefore.getDate() - 1);

        const openingItems = await prisma.journalItem.groupBy({
            by: ["accountId"],
            where: {
                accountId: { in: Array.from(cashBankIds) },
                journalEntry: {
                    clientId,
                    status: JournalStatus.Posted,
                    date: { lte: dayBefore },
                    deletedAt: null,
                },
            },
            _sum: { debit: true, credit: true },
        });

        const openingBalance = openingItems.reduce(
            (sum, item) => sum + (Number(item._sum.debit ?? 0) - Number(item._sum.credit ?? 0)),
            0
        );
        const closingBalance = openingBalance + netCashChange;

        return {
            success: true,
            data: {
                operating: { items: operating, total: Math.round(totalOperating) },
                investing: { items: investing, total: Math.round(totalInvesting) },
                financing: { items: financing, total: Math.round(totalFinancing) },
                netCashChange: Math.round(netCashChange),
                openingBalance: Math.round(openingBalance),
                closingBalance: Math.round(closingBalance),
            },
        };
    } catch (error) {
        log.error({ err: error }, "getCashFlowReport failed");
        return handleAuthError(error);
    }
}
