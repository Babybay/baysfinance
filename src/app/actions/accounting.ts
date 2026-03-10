"use server";

import { prisma } from "@/lib/prisma";
import { AccountType, JournalStatus, Prisma } from "@prisma/client";
import { validateJournalBalance } from "@/lib/accounting-helpers";
import {
    assertCanAccessClient,
    handleAuthError,
    isAdminOrStaff,
} from "@/lib/auth-helpers";

// ── CHART OF ACCOUNTS ────────────────────────────────────────────────────────

/**
 * Returns accounts visible to the current user for a given client.
 * Shared accounts (clientId = null) are always included.
 * Client-role users can only fetch accounts for their own clientId.
 */
export async function getAccounts(clientId?: string) {
    try {
        if (clientId) {
            await assertCanAccessClient(clientId);
        } else {
            // Only admins/staff may fetch shared accounts without specifying a client
            const admin = await isAdminOrStaff();
            if (!admin) {
                return { success: false, data: [], error: "Akses ditolak." };
            }
        }

        const accounts = await prisma.account.findMany({
            where: {
                OR: [
                    { clientId: null },
                    { clientId: clientId || undefined },
                ],
                isActive: true,
            },
            orderBy: { code: "asc" },
        });
        return { success: true, data: accounts };
    } catch (error) {
        console.error("[getAccounts]", error);
        return { ...handleAuthError(error), data: [] };
    }
}

export async function createAccount(data: {
    code: string;
    name: string;
    type: AccountType;
    isActive: boolean;
    clientId?: string;
}) {
    try {
        const resolvedClientId = data.clientId || null;

        // C3: Only the owning client or admins/staff may create accounts
        if (resolvedClientId) {
            await assertCanAccessClient(resolvedClientId);
        } else {
            const admin = await isAdminOrStaff();
            if (!admin) return { success: false, error: "Akses ditolak." };
        }

        const exists = await prisma.account.findFirst({
            where: { code: data.code, clientId: resolvedClientId },
        });
        if (exists) return { success: false, error: "Kode akun sudah digunakan." };

        const account = await prisma.account.create({
            data: { ...data, clientId: resolvedClientId },
        });
        return { success: true, data: account };
    } catch (error) {
        console.error("[createAccount]", error);
        return handleAuthError(error);
    }
}

export async function updateAccount(
    id: string,
    data: Partial<{ code: string; name: string; type: AccountType; isActive: boolean }>
) {
    try {
        const current = await prisma.account.findUnique({ where: { id } });
        if (!current) return { success: false, error: "Akun tidak ditemukan." };

        // C3: authorise against the account's owning client
        if (current.clientId) {
            await assertCanAccessClient(current.clientId);
        } else {
            const admin = await isAdminOrStaff();
            if (!admin) return { success: false, error: "Akses ditolak." };
        }

        if (data.code && data.code !== current.code) {
            const exists = await prisma.account.findFirst({
                where: { code: data.code, clientId: current.clientId },
            });
            if (exists) return { success: false, error: "Kode akun sudah digunakan." };
        }

        const account = await prisma.account.update({ where: { id }, data });
        return { success: true, data: account };
    } catch (error) {
        console.error("[updateAccount]", error);
        return handleAuthError(error);
    }
}

export async function deleteAccount(id: string) {
    try {
        const current = await prisma.account.findUnique({ where: { id } });
        if (!current) return { success: false, error: "Akun tidak ditemukan." };

        // C3: authorise
        if (current.clientId) {
            await assertCanAccessClient(current.clientId);
        } else {
            const admin = await isAdminOrStaff();
            if (!admin) return { success: false, error: "Akses ditolak." };
        }

        await prisma.account.delete({ where: { id } });
        return { success: true };
    } catch (error) {
        console.error("[deleteAccount]", error);
        return handleAuthError(error);
    }
}

// ── JOURNAL ENTRIES ──────────────────────────────────────────────────────────

export async function createJournalEntry(data: {
    /** Ignored — reference is always generated server-side to prevent races (L2). */
    reference?: string;
    date: Date;
    description: string;
    clientId: string;
    items: { accountId: string; description?: string; debit: number; credit: number }[];
}) {
    try {
        // C1: authorise
        await assertCanAccessClient(data.clientId);

        // Double-entry validation
        const validation = validateJournalBalance(data.items);
        if (!validation.isValid) {
            return { success: false, error: validation.error };
        }

        const totalDebit = data.items.reduce((sum, item) => sum + item.debit, 0);
        const totalCredit = data.items.reduce((sum, item) => sum + item.credit, 0);

        // L2: Atomic ref number via INSERT … ON CONFLICT DO UPDATE (no race condition)
        const dateStr = data.date.toISOString().slice(0, 7).replace("-", ""); // YYYYMM
        const counterKey = `JV-${dateStr}`;

        const entry = await prisma.$transaction(async (tx) => {
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
            const refNumber = `JV-${dateStr}-${seq.toString().padStart(4, "0")}`;

            return tx.journalEntry.create({
                data: {
                    refNumber,
                    date: data.date,
                    description: data.description,
                    status: JournalStatus.Posted,
                    clientId: data.clientId,
                    totalDebit,
                    totalCredit,
                    items: {
                        create: data.items.map((item) => ({
                            accountId: item.accountId,
                            debit: item.debit,
                            credit: item.credit,
                        })),
                    },
                },
                include: { items: true },
            });
        });

        // Convert Decimal → number before crossing the server/client boundary (M6)
        return {
            success: true,
            data: {
                ...entry,
                totalDebit: Number(entry.totalDebit),
                totalCredit: Number(entry.totalCredit),
                items: entry.items.map((i) => ({
                    ...i,
                    debit: Number(i.debit),
                    credit: Number(i.credit),
                })),
            },
        };
    } catch (error) {
        console.error("[createJournalEntry]", error);
        return handleAuthError(error);
    }
}

/**
 * M1 — Void a DRAFT journal entry.
 * Posted entries cannot be deleted; create a reversing entry instead.
 */
export async function deleteJournalEntry(id: string) {
    try {
        const entry = await prisma.journalEntry.findUnique({
            where: { id },
            select: { id: true, status: true, clientId: true },
        });
        if (!entry) return { success: false, error: "Jurnal tidak ditemukan." };

        if (entry.status === JournalStatus.Posted) {
            return {
                success: false,
                error:
                    "Jurnal yang sudah diposting tidak dapat dihapus. Buat jurnal pembalik untuk membatalkan.",
            };
        }

        await assertCanAccessClient(entry.clientId);
        await prisma.journalEntry.delete({ where: { id } });
        return { success: true };
    } catch (error) {
        console.error("[deleteJournalEntry]", error);
        return handleAuthError(error);
    }
}

/**
 * M1 — Update a DRAFT journal entry only.
 * Posted entries are immutable.
 */
export async function updateJournalEntry(
    id: string,
    data: {
        date?: Date;
        description?: string;
        items?: { accountId: string; debit: number; credit: number }[];
    }
) {
    try {
        const entry = await prisma.journalEntry.findUnique({
            where: { id },
            select: { id: true, status: true, clientId: true },
        });
        if (!entry) return { success: false, error: "Jurnal tidak ditemukan." };

        if (entry.status === JournalStatus.Posted) {
            return {
                success: false,
                error: "Jurnal yang sudah diposting tidak dapat diubah.",
            };
        }

        await assertCanAccessClient(entry.clientId);

        if (data.items) {
            const validation = validateJournalBalance(data.items);
            if (!validation.isValid) return { success: false, error: validation.error };
        }

        const totalDebit = data.items?.reduce((s, i) => s + i.debit, 0);
        const totalCredit = data.items?.reduce((s, i) => s + i.credit, 0);

        const updated = await prisma.$transaction(async (tx) => {
            if (data.items) {
                await tx.journalItem.deleteMany({ where: { journalEntryId: id } });
            }
            return tx.journalEntry.update({
                where: { id },
                data: {
                    ...(data.date && { date: data.date }),
                    ...(data.description !== undefined && { description: data.description }),
                    ...(totalDebit !== undefined && { totalDebit, totalCredit }),
                    ...(data.items && {
                        items: {
                            create: data.items.map((i) => ({
                                accountId: i.accountId,
                                debit: i.debit,
                                credit: i.credit,
                            })),
                        },
                    }),
                },
                include: { items: true },
            });
        });

        return {
            success: true,
            data: {
                ...updated,
                totalDebit: Number(updated.totalDebit),
                totalCredit: Number(updated.totalCredit),
            },
        };
    } catch (error) {
        console.error("[updateJournalEntry]", error);
        return handleAuthError(error);
    }
}

/**
 * C2 fix: clientId is now required (was optional → all-tenant leak).
 * M4: returns paginated results with total count.
 */
export async function getJournalEntries(
    clientId: string,
    page = 1,
    pageSize = 20
) {
    try {
        await assertCanAccessClient(clientId);

        const skip = (page - 1) * pageSize;

        const [entries, total] = await prisma.$transaction([
            prisma.journalEntry.findMany({
                where: { clientId },
                include: {
                    client: { select: { nama: true } },
                    items: {
                        include: {
                            account: { select: { name: true, code: true } },
                        },
                    },
                },
                orderBy: { date: "desc" },
                skip,
                take: pageSize,
            }),
            prisma.journalEntry.count({ where: { clientId } }),
        ]);

        const data = entries.map((entry) => {
            const debitSum = entry.items.reduce((s, i) => s + Number(i.debit), 0);
            return {
                ...entry,
                reference: entry.refNumber,
                clientName: entry.client.nama,
                totalAmount: debitSum,
                totalDebit: Number(entry.totalDebit),
                totalCredit: Number(entry.totalCredit),
                items: entry.items.map((item) => ({
                    ...item,
                    debit: Number(item.debit),
                    credit: Number(item.credit),
                    accountName: item.account.name,
                    accountCode: item.account.code,
                })),
            };
        });

        return { success: true, data, total, page, pageSize };
    } catch (error) {
        console.error("[getJournalEntries]", error);
        return { ...handleAuthError(error), data: [], total: 0, page, pageSize };
    }
}

// ── GENERAL LEDGER ───────────────────────────────────────────────────────────

export async function getGeneralLedger(
    accountId: string,
    clientId: string,
    startDate?: Date,
    endDate?: Date
) {
    try {
        await assertCanAccessClient(clientId);

        const items = await prisma.journalItem.findMany({
            where: {
                accountId,
                journalEntry: {
                    clientId,
                    status: JournalStatus.Posted,
                    deletedAt: null,
                    date: { gte: startDate, lte: endDate },
                },
            },
            include: { journalEntry: true },
            orderBy: { journalEntry: { date: "asc" } },
        });

        let balance = 0;
        const formattedItems = items.map((item) => {
            const d = Number(item.debit);
            const c = Number(item.credit);
            balance += d - c;
            return { ...item, debit: d, credit: c, runningBalance: balance };
        });

        return { success: true, data: formattedItems, totalBalance: balance };
    } catch (error) {
        console.error("[getGeneralLedger]", error);
        return { ...handleAuthError(error), data: [], totalBalance: 0 };
    }
}

// ── FINANCIAL REPORTS ────────────────────────────────────────────────────────

/**
 * M5: Aggregation is now done entirely in PostgreSQL via groupBy + _sum.
 * Previously it loaded every JournalItem row into JavaScript memory.
 */
export async function getFinancialReports(
    clientId: string,
    endDate: Date = new Date()
) {
    try {
        await assertCanAccessClient(clientId);

        const client = await prisma.client.findUnique({
            where: { id: clientId },
            select: { id: true },
        });
        if (!client) return { success: false, error: "Klien tidak ditemukan." };

        // Single aggregation query — no full-table scan into JS
        const sums = await prisma.journalItem.groupBy({
            by: ["accountId"],
            where: {
                journalEntry: {
                    clientId,
                    status: JournalStatus.Posted,
                    deletedAt: null,
                    date: { lte: endDate },
                },
            },
            _sum: { debit: true, credit: true },
        });

        const accountIds = sums.map((s) => s.accountId);
        const accounts = await prisma.account.findMany({
            where: {
                id: { in: accountIds },
                OR: [{ clientId: null }, { clientId }],
            },
            select: { id: true, name: true, type: true },
        });

        // raw balance = debit − credit
        const rawBalances = new Map<string, number>();
        for (const s of sums) {
            rawBalances.set(
                s.accountId,
                Number(s._sum.debit ?? 0) - Number(s._sum.credit ?? 0)
            );
        }

        const val = (id: string, negate = false) => {
            const raw = rawBalances.get(id) || 0;
            return negate ? -raw : raw;
        };

        const report = {
            neraca: {
                assets: accounts
                    .filter((a) => a.type === AccountType.Asset)
                    .map((a) => ({ name: a.name, value: val(a.id) })),
                liabilities: accounts
                    .filter((a) => a.type === AccountType.Liability)
                    .map((a) => ({ name: a.name, value: val(a.id, true) })),
                equity: accounts
                    .filter((a) => a.type === AccountType.Equity)
                    .map((a) => ({ name: a.name, value: val(a.id, true) })),
            },
            labaRugi: {
                revenue: accounts
                    .filter((a) => a.type === AccountType.Revenue)
                    .map((a) => ({ name: a.name, value: val(a.id, true) })),
                expenses: accounts
                    .filter((a) => a.type === AccountType.Expense)
                    .map((a) => ({ name: a.name, value: val(a.id) })),
            },
        };

        return { success: true, data: report };
    } catch (error) {
        console.error("[getFinancialReports]", error);
        return handleAuthError(error);
    }
}
