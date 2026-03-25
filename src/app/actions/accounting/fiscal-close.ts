"use server";

import { prisma } from "@/lib/prisma";
import { AccountType, JournalStatus, Prisma } from "@prisma/client";
import { assertCanAccessClient, handleAuthError, isAdminOrStaff } from "@/lib/auth-helpers";
import { getCurrentUser } from "@/lib/auth-helpers";
import { round2 } from "@/lib/accounting-helpers";

// ── GET FISCAL PERIOD CLOSES ────────────────────────────────────────────────

export async function getFiscalCloses(clientId: string) {
    try {
        await assertCanAccessClient(clientId);

        const closes = await prisma.fiscalPeriodClose.findMany({
            where: { clientId },
            include: {
                journalEntry: { select: { refNumber: true } },
            },
            orderBy: { periodEnd: "desc" },
        });

        return {
            success: true,
            data: closes.map((c) => ({
                ...c,
                netIncome: Number(c.netIncome),
                journalRefNumber: c.journalEntry.refNumber,
            })),
        };
    } catch (error) {
        console.error("[getFiscalCloses]", error);
        return { ...handleAuthError(error), data: [] };
    }
}

// ── CLOSE FISCAL PERIOD ─────────────────────────────────────────────────────

const SALDO_LABA_CODE = "513";

export async function closeFiscalPeriod(data: {
    clientId: string;
    periodLabel: string;
    periodStart: Date;
    periodEnd: Date;
}) {
    try {
        const admin = await isAdminOrStaff();
        if (!admin) return { success: false, error: "Hanya admin yang dapat menutup periode." };

        await assertCanAccessClient(data.clientId);

        const user = await getCurrentUser();
        const closedBy = user?.id || "system";

        return await prisma.$transaction(async (tx) => {
            // 1. Check for existing close
            const existing = await tx.fiscalPeriodClose.findUnique({
                where: {
                    clientId_periodLabel: {
                        clientId: data.clientId,
                        periodLabel: data.periodLabel,
                    },
                },
            });
            if (existing) {
                return { success: false as const, error: `Periode "${data.periodLabel}" sudah ditutup.` };
            }

            // 2. Check for unposted draft entries in the period
            const draftCount = await tx.journalEntry.count({
                where: {
                    clientId: data.clientId,
                    status: JournalStatus.Draft,
                    date: { gte: data.periodStart, lte: data.periodEnd },
                    deletedAt: null,
                },
            });
            if (draftCount > 0) {
                return {
                    success: false as const,
                    error: `Masih ada ${draftCount} jurnal berstatus Draft dalam periode ini. Posting atau hapus terlebih dahulu.`,
                };
            }

            // 3. Aggregate Revenue and Expense accounts for the period
            const periodSums = await tx.journalItem.groupBy({
                by: ["accountId"],
                where: {
                    journalEntry: {
                        clientId: data.clientId,
                        status: JournalStatus.Posted,
                        deletedAt: null,
                        date: { gte: data.periodStart, lte: data.periodEnd },
                    },
                },
                _sum: { debit: true, credit: true },
            });

            const accountIds = periodSums.map((s) => s.accountId);
            const accounts = await tx.account.findMany({
                where: {
                    id: { in: accountIds },
                    type: { in: [AccountType.Revenue, AccountType.Expense] },
                },
                select: { id: true, type: true, name: true },
            });

            const accountTypeMap = new Map(accounts.map((a) => [a.id, a]));

            // 4. Build closing journal items
            const closingItems: { accountId: string; debit: number; credit: number }[] = [];
            let totalRevenue = 0;
            let totalExpenses = 0;

            for (const sum of periodSums) {
                const account = accountTypeMap.get(sum.accountId);
                if (!account) continue; // Skip non-Revenue/Expense accounts

                const debitBal = Number(sum._sum.debit ?? 0);
                const creditBal = Number(sum._sum.credit ?? 0);
                const netBalance = round2(debitBal - creditBal);

                if (account.type === AccountType.Revenue) {
                    // Revenue normally has credit balance (netBalance < 0)
                    // To close: debit the account (zero it out)
                    const revenueAmount = round2(creditBal - debitBal);
                    if (revenueAmount > 0) {
                        closingItems.push({ accountId: account.id, debit: revenueAmount, credit: 0 });
                        totalRevenue += revenueAmount;
                    }
                } else if (account.type === AccountType.Expense) {
                    // Expense normally has debit balance (netBalance > 0)
                    // To close: credit the account (zero it out)
                    const expenseAmount = round2(debitBal - creditBal);
                    if (expenseAmount > 0) {
                        closingItems.push({ accountId: account.id, debit: 0, credit: expenseAmount });
                        totalExpenses += expenseAmount;
                    }
                }
            }

            if (closingItems.length === 0) {
                return {
                    success: false as const,
                    error: "Tidak ada saldo Revenue/Expense untuk ditutup pada periode ini.",
                };
            }

            // 5. Net income → Saldo Laba (513)
            const netIncome = round2(totalRevenue - totalExpenses);

            // Resolve Saldo Laba account
            const saldoLabaAccount = await tx.account.findFirst({
                where: {
                    code: SALDO_LABA_CODE,
                    OR: [{ clientId: null }, { clientId: data.clientId }],
                    isActive: true,
                },
                select: { id: true },
                orderBy: { clientId: "desc" }, // Prefer client-specific
            });

            if (!saldoLabaAccount) {
                return {
                    success: false as const,
                    error: `Akun Saldo Laba (${SALDO_LABA_CODE}) tidak ditemukan. Jalankan seed akun terlebih dahulu.`,
                };
            }

            // Credit Saldo Laba if profit, Debit if loss
            if (netIncome >= 0) {
                closingItems.push({ accountId: saldoLabaAccount.id, debit: 0, credit: netIncome });
            } else {
                closingItems.push({ accountId: saldoLabaAccount.id, debit: round2(-netIncome), credit: 0 });
            }

            const totalDebit = round2(closingItems.reduce((s, i) => s + i.debit, 0));
            const totalCredit = round2(closingItems.reduce((s, i) => s + i.credit, 0));

            // 6. Generate ref number and create closing journal
            const dateStr = data.periodEnd.toISOString().slice(0, 7).replace("-", "");
            const counterKey = `CL-${dateStr}`;

            const rows = await tx.$queryRaw<[{ counter: number }]>(
                Prisma.sql`
                    INSERT INTO permit_counters (id, counter)
                    VALUES (${counterKey}, 1)
                    ON CONFLICT (id) DO UPDATE
                        SET counter = permit_counters.counter + 1
                    RETURNING counter
                `
            );
            const seq = rows[0].counter;
            const refNumber = `CL-${dateStr}-${seq.toString().padStart(4, "0")}`;

            const entry = await tx.journalEntry.create({
                data: {
                    refNumber,
                    date: data.periodEnd,
                    description: `Penutupan periode ${data.periodLabel}`,
                    status: JournalStatus.Posted,
                    clientId: data.clientId,
                    totalDebit,
                    totalCredit,
                    source: "auto_period_close",
                    items: {
                        create: closingItems.map((item) => ({
                            accountId: item.accountId,
                            debit: item.debit,
                            credit: item.credit,
                        })),
                    },
                },
            });

            // 7. Create FiscalPeriodClose record
            await tx.fiscalPeriodClose.create({
                data: {
                    clientId: data.clientId,
                    periodLabel: data.periodLabel,
                    periodStart: data.periodStart,
                    periodEnd: data.periodEnd,
                    closedBy,
                    journalEntryId: entry.id,
                    netIncome,
                },
            });

            return {
                success: true as const,
                data: {
                    journalRefNumber: refNumber,
                    netIncome,
                    closedItems: closingItems.length,
                    totalRevenue,
                    totalExpenses,
                },
            };
        });
    } catch (error) {
        console.error("[closeFiscalPeriod]", error);
        return handleAuthError(error);
    }
}
