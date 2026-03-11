"use server";

import { prisma } from "@/lib/prisma";
import { JournalStatus, AccountType } from "@prisma/client";
import { assertCanAccessClient, handleAuthError } from "@/lib/auth-helpers";

/** Maximum allowed date range for ledger queries (prevents expensive full-history scans). */
const MAX_RANGE_MS = 365 * 24 * 60 * 60 * 1000; // 1 year

export interface BukuBesarTransaction {
    date: string;
    refNumber: string;
    description: string;
    debit: number;
    credit: number;
    runningBalance: number;
}

export interface BukuBesarAccount {
    accountId: string;
    accountCode: string;
    accountName: string;
    accountType: AccountType;
    openingBalance: number;
    transactions: BukuBesarTransaction[];
    closingBalance: number;
    totalDebit: number;
    totalCredit: number;
}

export interface BukuBesarData {
    clientId: string;
    clientName: string;
    startDate: string;
    endDate: string;
    accounts: BukuBesarAccount[];
}

/**
 * Determine the natural balance sign for an account type.
 * Asset/Expense: debit - credit (positive = debit-normal)
 * Liability/Equity/Revenue: credit - debit (positive = credit-normal)
 */
function balanceDirection(type: AccountType): 1 | -1 {
    if (type === AccountType.Asset || type === AccountType.Expense) return 1;
    return -1;
}

export async function getBukuBesar(
    clientId: string,
    startDate: Date,
    endDate: Date,
    accountCode?: string
): Promise<{ success: boolean; data?: BukuBesarData; error?: string }> {
    try {
        // C1: authorise before touching any data
        await assertCanAccessClient(clientId);

        // Validate date range
        if (endDate < startDate) {
            return { success: false, error: "Tanggal akhir harus setelah tanggal awal" };
        }

        // L3: cap maximum query range to 1 year
        if (endDate.getTime() - startDate.getTime() > MAX_RANGE_MS) {
            return { success: false, error: "Rentang tanggal maksimal 1 tahun." };
        }

        // 1. Get client
        const client = await prisma.client.findUnique({
            where: { id: clientId },
            select: { id: true, nama: true },
        });
        if (!client) return { success: false, error: "Klien tidak ditemukan" };

        // 2. Get accounts for this client
        const accountWhere: {
            OR: { clientId: null | string }[];
            isActive: boolean;
            code?: string;
        } = {
            OR: [{ clientId: null }, { clientId }],
            isActive: true,
        };
        if (accountCode) {
            accountWhere.code = accountCode;
        }

        const accounts = await prisma.account.findMany({
            where: accountWhere,
            orderBy: { code: "asc" },
        });

        if (accounts.length === 0) {
            return {
                success: true,
                data: {
                    clientId: client.id,
                    clientName: client.nama,
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString(),
                    accounts: [],
                },
            };
        }

        const accountIds = accounts.map((a) => a.id);

        // 3. Get opening balance (all posted items BEFORE startDate)
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

        const openingBalances: Record<string, number> = {};
        for (const item of openingItems) {
            // M6: convert Decimal → number for arithmetic
            openingBalances[item.accountId] =
                (openingBalances[item.accountId] || 0) + (Number(item.debit) - Number(item.credit));
        }

        // 4. Get transactions within the period
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
            include: {
                journalEntry: {
                    select: { date: true, refNumber: true, description: true },
                },
            },
            orderBy: { journalEntry: { date: "asc" } },
        });

        // Group items by accountId
        const itemsByAccount: Record<string, typeof periodItems> = {};
        for (const item of periodItems) {
            if (!itemsByAccount[item.accountId]) {
                itemsByAccount[item.accountId] = [];
            }
            itemsByAccount[item.accountId].push(item);
        }

        // 5. Build per-account ledger
        const bukuBesarAccounts: BukuBesarAccount[] = [];

        for (const account of accounts) {
            const items = itemsByAccount[account.id] || [];
            const dir = balanceDirection(account.type);
            const rawOpening = openingBalances[account.id] || 0;
            // Apply direction: for credit-normal accounts, flip the sign
            const openingBalance = rawOpening * dir;

            let running = openingBalance;
            let totalDebit = 0;
            let totalCredit = 0;

            const transactions: BukuBesarTransaction[] = items.map((item) => {
                // M6: convert Decimal → number
                const d = Number(item.debit);
                const c = Number(item.credit);
                totalDebit += d;
                totalCredit += c;
                running += (d - c) * dir;
                return {
                    date: item.journalEntry.date.toISOString(),
                    refNumber: item.journalEntry.refNumber,
                    description: item.journalEntry.description || "",
                    debit: d,
                    credit: c,
                    runningBalance: running,
                };
            });

            // Only include accounts that have an opening balance or transactions
            if (openingBalance !== 0 || transactions.length > 0) {
                bukuBesarAccounts.push({
                    accountId: account.id,
                    accountCode: account.code,
                    accountName: account.name,
                    accountType: account.type,
                    openingBalance,
                    transactions,
                    closingBalance: running,
                    totalDebit,
                    totalCredit,
                });
            }
        }

        return {
            success: true,
            data: {
                clientId: client.id,
                clientName: client.nama,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                accounts: bukuBesarAccounts,
            },
        };
    } catch (error) {
        console.error("[getBukuBesar]", error);
        if (error instanceof Error && (error.message === "UNAUTHENTICATED" || error.message === "FORBIDDEN")) {
            return handleAuthError(error);
        }
        return { success: false, error: "Gagal memuat data buku besar." };
    }
}
