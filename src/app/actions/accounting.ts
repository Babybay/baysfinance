"use server";

import { prisma } from "@/lib/prisma";
import { AccountType, JournalStatus } from "@prisma/client";

// ── CHART OF ACCOUNTS ────────────────────────────────────────────────────────

export async function getAccounts(clientId?: string) {
    try {
        const accounts = await prisma.account.findMany({
            where: {
                OR: [
                    { clientId: null },
                    { clientId: clientId || undefined }
                ],
                isActive: true
            },
            orderBy: { code: "asc" }
        });
        return { success: true, data: accounts };
    } catch (error) {
        console.error("getAccounts error:", error);
        return { success: false, data: [], error: "Gagal mengambil data akun" };
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
        const exists = await prisma.account.findFirst({
            where: { code: data.code, clientId: resolvedClientId }
        });

        if (exists) return { success: false, error: "Kode akun sudah digunakan." };

        const account = await prisma.account.create({
            data: {
                ...data,
                clientId: resolvedClientId
            }
        });
        return { success: true, data: account };
    } catch (error) {
        console.error("createAccount error:", error);
        return { success: false, error: "Gagal membuat akun." };
    }
}

export async function updateAccount(id: string, data: Partial<{
    code: string;
    name: string;
    type: AccountType;
    isActive: boolean;
}>) {
    try {
        // Optional uniqueness check before updating
        if (data.code) {
            const current = await prisma.account.findUnique({ where: { id } });
            if (current && current.code !== data.code) {
                const exists = await prisma.account.findFirst({
                    where: { code: data.code, clientId: current.clientId }
                });
                if (exists) return { success: false, error: "Kode akun sudah digunakan." };
            }
        }

        const account = await prisma.account.update({
            where: { id },
            data
        });
        return { success: true, data: account };
    } catch (error) {
        console.error("updateAccount error:", error);
        return { success: false, error: "Gagal memperbarui akun." };
    }
}

export async function deleteAccount(id: string) {
    try {
        await prisma.account.delete({ where: { id } });
        return { success: true };
    } catch (error) {
        console.error("deleteAccount error:", error);
        return { success: false, error: "Gagal menghapus akun." };
    }
}

// ── JOURNAL ENTRIES ──────────────────────────────────────────────────────────
import { validateJournalBalance } from "@/lib/accounting-helpers";

export async function createJournalEntry(data: {
    reference?: string;
    date: Date;
    description: string;
    clientId: string;
    items: { accountId: string; debit: number; credit: number }[];
}) {

    try {
        const validation = validateJournalBalance(data.items);
        if (!validation.isValid) {
            return { success: false, error: validation.error };
        }

        const totalDebit = data.items.reduce((sum, item) => sum + item.debit, 0);
        const totalCredit = data.items.reduce((sum, item) => sum + item.credit, 0);

        // Generate Ref Number (e.g., JV-202403-0001)
        const dateStr = data.date.toISOString().slice(0, 7).replace("-", ""); // YYYYMM
        const count = await prisma.journalEntry.count({
            where: {
                refNumber: { contains: `JV-${dateStr}` }
            }
        });
        const refNumber = `JV-${dateStr}-${(count + 1).toString().padStart(4, "0")}`;

        const entry = await prisma.journalEntry.create({
            data: {
                refNumber,
                date: data.date,
                description: data.description,
                status: JournalStatus.Posted, // Assume auto-posted for now
                clientId: data.clientId,
                totalDebit,
                totalCredit,
                items: {
                    create: data.items.map(item => ({
                        accountId: item.accountId,
                        debit: item.debit,
                        credit: item.credit
                    }))
                }
            },
            include: { items: true }
        });

        return { success: true, data: entry };
    } catch (error) {
        console.error("createJournalEntry error:", error);
        return { success: false, error: "Gagal menyimpan jurnal" };
    }
}

export async function getJournalEntries(clientId?: string) {
    try {
        const entries = await prisma.journalEntry.findMany({
            where: clientId ? { clientId } : {},
            include: {
                client: {
                    select: { nama: true }
                },
                items: {
                    include: { account: true }
                }
            },
            orderBy: { date: "desc" }
        });

        // Map to JournalEntry interface from @/lib/data
        const mappedEntries = entries.map(entry => {
            const totalDebit = entry.items.reduce((sum, item) => sum + item.debit, 0);
            return {
                ...entry,
                reference: entry.refNumber, // Map refNumber to reference
                clientName: entry.client.nama,
                totalAmount: totalDebit, // Set totalAmount for UI
                items: entry.items.map(item => ({
                    ...item,
                    accountName: item.account.name,
                    accountCode: item.account.code
                }))
            };
        });

        return { success: true, data: mappedEntries };
    } catch (error) {
        console.error("getJournalEntries error:", error);
        return { success: false, data: [], error: "Gagal mengambil data jurnal" };
    }
}

// ── GENERAL LEDGER ───────────────────────────────────────────────────────────

export async function getGeneralLedger(accountId: string, clientId: string, startDate?: Date, endDate?: Date) {
    try {
        const items = await prisma.journalItem.findMany({
            where: {
                accountId,
                journalEntry: {
                    clientId,
                    status: JournalStatus.Posted,
                    deletedAt: null,
                    date: {
                        gte: startDate,
                        lte: endDate
                    }
                }
            },
            include: {
                journalEntry: true
            },
            orderBy: {
                journalEntry: { date: "asc" }
            }
        });

        // Calculate running balance
        let balance = 0;
        const formattedItems = items.map(item => {
            // Logic depends on account type, but simple balance = debit - credit for now
            balance += (item.debit - item.credit);
            return {
                ...item,
                runningBalance: balance
            };
        });

        return { success: true, data: formattedItems, totalBalance: balance };
    } catch (error) {
        console.error("getGeneralLedger error:", error);
        return { success: false, data: [], error: "Gagal mengambil data buku besar" };
    }
}

// ── FINANCIAL REPORTS ────────────────────────────────────────────────────────

export async function getFinancialReports(clientId: string, endDate: Date = new Date()) {
    try {
        // 1. Get all accounts
        const accounts = await prisma.account.findMany({
            where: {
                OR: [{ clientId: null }, { clientId }]
            }
        });

        // 2. Get all posted journal items for this client up to endDate
        const items = await prisma.journalItem.findMany({
            where: {
                journalEntry: {
                    clientId,
                    status: JournalStatus.Posted,
                    deletedAt: null,
                    date: { lte: endDate }
                }
            }
        });

        const balances: Record<string, number> = {};
        items.forEach(item => {
            balances[item.accountId] = (balances[item.accountId] || 0) + (item.debit - item.credit);
        });

        // 3. Structure findings
        const report = {
            neraca: {
                assets: accounts.filter(a => a.type === AccountType.Asset).map(a => ({ name: a.name, value: balances[a.id] || 0 })),
                liabilities: accounts.filter(a => a.type === AccountType.Liability).map(a => ({ name: a.name, value: (balances[a.id] || 0) * -1 })),
                equity: accounts.filter(a => a.type === AccountType.Equity).map(a => ({ name: a.name, value: (balances[a.id] || 0) * -1 }))
            },
            labaRugi: {
                revenue: accounts.filter(a => a.type === AccountType.Revenue).map(a => ({ name: a.name, value: (balances[a.id] || 0) * -1 })),
                expenses: accounts.filter(a => a.type === AccountType.Expense).map(a => ({ name: a.name, value: balances[a.id] || 0 }))
            }
        };

        return { success: true, data: report };
    } catch (error) {
        console.error("getFinancialReports error:", error);
        return { success: false, error: "Gagal generate laporan" };
    }
}
