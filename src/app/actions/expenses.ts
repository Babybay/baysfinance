"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
    assertCanAccessClient,
    getCurrentUser,
    handleAuthError,
    isAdminOrStaff,
} from "@/lib/auth-helpers";
import { writeAuditLog } from "@/lib/audit";
import { createLogger } from "@/lib/logger";
import { createExpenseJournal } from "@/lib/auto-journal";
import { roundRupiah } from "@/lib/accounting-helpers";
import { PPH_RATES } from "@/lib/tax-config";

const log = createLogger("expenses");

// ─── GET EXPENSES ───────────────────────────────────────────────────────────

export async function getExpenses(clientId?: string, page = 1, pageSize = 50) {
    try {
        if (clientId) {
            await assertCanAccessClient(clientId);
        } else {
            const admin = await isAdminOrStaff();
            if (!admin) return { success: false, data: [], total: 0, error: "Akses ditolak." };
        }

        page = Math.max(1, Math.floor(page));
        pageSize = Math.min(Math.max(1, Math.floor(pageSize)), 100);
        const skip = (page - 1) * pageSize;

        const where = clientId ? { clientId } : undefined;

        const [expenses, total] = await prisma.$transaction([
            prisma.expense.findMany({
                where,
                include: { client: { select: { nama: true } } },
                orderBy: { tanggal: "desc" },
                skip,
                take: pageSize,
            }),
            prisma.expense.count({ where }),
        ]);

        return {
            success: true,
            data: expenses.map((e) => ({
                ...e,
                jumlah: Number(e.jumlah),
                pphRate: e.pphRate ? Number(e.pphRate) : null,
                pphAmount: e.pphAmount ? Number(e.pphAmount) : null,
                netAmount: e.netAmount ? Number(e.netAmount) : null,
                clientName: e.client.nama,
            })),
            total,
            page,
            pageSize,
        };
    } catch (error) {
        log.error({ err: error }, "getExpenses failed");
        return { ...handleAuthError(error), data: [], total: 0 };
    }
}

// ─── CREATE EXPENSE ─────────────────────────────────────────────────────────

export async function createExpense(data: {
    clientId: string;
    tanggal: string;
    deskripsi: string;
    jumlah: number;
    vendor?: string;
    isPaid?: boolean;
    metodePembayaran?: string;
    expenseAccountCode: string;
    bankAccountCode?: string;
    pphType?: string;
    catatan?: string;
}) {
    try {
        await assertCanAccessClient(data.clientId);

        // Input validation
        if (!data.deskripsi.trim()) {
            return { success: false, error: "Deskripsi tidak boleh kosong." };
        }
        if (typeof data.jumlah !== "number" || data.jumlah <= 0) {
            return { success: false, error: "Jumlah harus lebih dari 0." };
        }
        if (data.jumlah > 999_999_999_999) {
            return { success: false, error: "Jumlah melebihi batas maksimum." };
        }

        const user = await getCurrentUser();
        const isPaid = data.isPaid !== false;
        const bankAccountCode = data.bankAccountCode || "110";

        // Calculate PPh withholding
        let pphRate: number | null = null;
        let pphAmount: number | null = null;
        let netAmount = data.jumlah;

        if (data.pphType) {
            const pphConfig = PPH_RATES[data.pphType];
            if (!pphConfig) {
                const validTypes = Object.keys(PPH_RATES).join(", ");
                return { success: false, error: `Tipe PPh "${data.pphType}" tidak valid. Pilihan: ${validTypes}` };
            }
            pphRate = pphConfig.rate;
            pphAmount = roundRupiah(data.jumlah * pphRate);
            netAmount = data.jumlah - pphAmount;
        }

        // Atomic counter for expense number
        const now = new Date(data.tanggal);
        const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
        const counterKey = `EXP-${dateStr}`;

        const expense = await prisma.$transaction(async (tx) => {
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
            const nomorBukti = `EXP-${dateStr}-${seq.toString().padStart(3, "0")}`;

            const created = await tx.expense.create({
                data: {
                    nomorBukti,
                    tanggal: new Date(data.tanggal),
                    deskripsi: data.deskripsi,
                    jumlah: data.jumlah,
                    vendor: data.vendor || null,
                    isPaid,
                    metodePembayaran: isPaid ? (data.metodePembayaran || "Transfer") : null,
                    expenseAccountCode: data.expenseAccountCode,
                    bankAccountCode,
                    pphType: data.pphType || null,
                    pphRate,
                    pphAmount,
                    netAmount,
                    catatan: data.catatan || null,
                    clientId: data.clientId,
                    createdBy: user?.id,
                },
            });

            // Auto-journal
            await createExpenseJournal(tx, {
                id: created.id,
                nomorBukti: created.nomorBukti,
                clientId: data.clientId,
                tanggal: new Date(data.tanggal),
                deskripsi: data.deskripsi,
                jumlah: data.jumlah,
                expenseAccountCode: data.expenseAccountCode,
                bankAccountCode,
                isPaid,
                pphType: data.pphType,
                pphRate,
                pphAmount,
                netAmount,
            });

            return created;
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

        writeAuditLog({
            action: "CREATE",
            model: "Expense",
            recordId: expense.id,
            clientId: data.clientId,
            after: { nomorBukti: expense.nomorBukti, jumlah: data.jumlah },
        });

        return { success: true, data: expense };
    } catch (error) {
        log.error({ err: error }, "createExpense failed");
        return handleAuthError(error);
    }
}

// ─── DELETE EXPENSE ─────────────────────────────────────────────────────────

export async function deleteExpense(id: string) {
    try {
        const existing = await prisma.expense.findUnique({
            where: { id },
            select: { id: true, clientId: true },
        });
        if (!existing) return { success: false, error: "Beban tidak ditemukan." };

        await assertCanAccessClient(existing.clientId);
        await prisma.expense.delete({ where: { id } });

        return { success: true };
    } catch (error) {
        log.error({ err: error }, "deleteExpense failed");
        return handleAuthError(error);
    }
}

// ─── GET EXPENSE ACCOUNT OPTIONS ────────────────────────────────────────────

export async function getExpenseAccountOptions(clientId: string) {
    try {
        await assertCanAccessClient(clientId);

        const accounts = await prisma.account.findMany({
            where: {
                type: "Expense",
                isActive: true,
                OR: [{ clientId: null }, { clientId }],
            },
            select: { code: true, name: true },
            orderBy: { code: "asc" },
        });

        return { success: true, data: accounts };
    } catch (error) {
        log.error({ err: error }, "getExpenseAccountOptions failed");
        return { ...handleAuthError(error), data: [] };
    }
}

// ─── GET BANK/CASH ACCOUNT OPTIONS ──────────────────────────────────────────

export async function getBankAccountOptions(clientId: string) {
    try {
        await assertCanAccessClient(clientId);

        const accounts = await prisma.account.findMany({
            where: {
                type: "Asset",
                isActive: true,
                OR: [{ clientId: null }, { clientId }],
                code: { in: ["100", "101", "110", "111", "112"] },
            },
            select: { code: true, name: true },
            orderBy: { code: "asc" },
        });

        return { success: true, data: accounts };
    } catch (error) {
        log.error({ err: error }, "getBankAccountOptions failed");
        return { ...handleAuthError(error), data: [] };
    }
}
