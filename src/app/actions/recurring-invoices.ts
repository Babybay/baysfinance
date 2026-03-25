"use server";

import { prisma } from "@/lib/prisma";
import { InvoiceStatus, Prisma, RecurringInterval } from "@prisma/client";
import {
    assertCanAccessClient,
    handleAuthError,
    isAdminOrStaff,
} from "@/lib/auth-helpers";
import { createInvoiceSentJournal } from "@/lib/auto-journal";
import { round2 } from "@/lib/accounting-helpers";
import { TAX_CONFIG } from "@/lib/tax-config";

// ─── GET RECURRING INVOICES ─────────────────────────────────────────────────

export async function getRecurringInvoices(clientId?: string) {
    try {
        if (clientId) {
            await assertCanAccessClient(clientId);
        } else {
            const admin = await isAdminOrStaff();
            if (!admin) return { success: false, data: [], error: "Akses ditolak." };
        }

        const where = clientId ? { clientId } : {};
        const recurring = await prisma.recurringInvoice.findMany({
            where,
            include: { items: true, client: true },
            orderBy: { nextRunDate: "asc" },
        });
        return { success: true, data: recurring };
    } catch (error) {
        console.error("getRecurringInvoices error:", error);
        return { ...handleAuthError(error), data: [] };
    }
}

// ─── HELPER: CALCULATE NEXT RUN DATE ────────────────────────────────────────

function calculateNextRunDate(interval: RecurringInterval, from?: Date): Date {
    const now = from ?? new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-based

    switch (interval) {
        case RecurringInterval.Monthly: {
            // 1st of next month
            return new Date(year, month + 1, 1);
        }
        case RecurringInterval.Quarterly: {
            // Next quarter start: Jan(0), Apr(3), Jul(6), Oct(9)
            const currentQuarter = Math.floor(month / 3);
            const nextQuarterStartMonth = (currentQuarter + 1) * 3;
            return new Date(year, nextQuarterStartMonth, 1);
        }
        case RecurringInterval.Yearly: {
            // Next Jan 1st
            return new Date(year + 1, 0, 1);
        }
    }
}

// ─── CREATE RECURRING INVOICE ───────────────────────────────────────────────

export async function createRecurringInvoice(data: {
    clientId: string;
    interval: "Monthly" | "Quarterly" | "Yearly";
    catatan: string;
    items: { deskripsi: string; qty: number; harga: number; jumlah: number }[];
}) {
    try {
        await assertCanAccessClient(data.clientId);

        // Server-side input validation
        if (!data.items || data.items.length === 0) {
            return { success: false, error: "Harus memiliki minimal 1 item." };
        }
        for (const item of data.items) {
            if (typeof item.qty !== "number" || item.qty <= 0) {
                return { success: false, error: "Jumlah (qty) harus lebih dari 0." };
            }
            if (typeof item.harga !== "number" || item.harga < 0) {
                return { success: false, error: "Harga tidak boleh negatif." };
            }
            if (item.harga > 999_999_999_999) {
                return { success: false, error: "Harga melebihi batas maksimum." };
            }
        }

        const client = await prisma.client.findUnique({ where: { id: data.clientId } });
        if (!client) return { success: false, error: "Klien tidak ditemukan" };

        const interval = data.interval as RecurringInterval;
        const nextRunDate = calculateNextRunDate(interval);

        const recurring = await prisma.recurringInvoice.create({
            data: {
                clientId: data.clientId,
                interval,
                nextRunDate,
                isActive: true,
                catatan: data.catatan || null,
                items: {
                    create: data.items.map((item) => ({
                        deskripsi: item.deskripsi,
                        qty: item.qty,
                        harga: item.harga,
                        jumlah: item.qty * item.harga,
                    })),
                },
            },
            include: { items: true, client: true },
        });

        return { success: true, data: recurring };
    } catch (error) {
        console.error("createRecurringInvoice error:", error);
        return handleAuthError(error);
    }
}

// ─── UPDATE RECURRING INVOICE STATUS ────────────────────────────────────────

export async function updateRecurringInvoiceStatus(id: string, isActive: boolean) {
    try {
        const existing = await prisma.recurringInvoice.findUnique({
            where: { id },
            select: { clientId: true },
        });
        if (!existing) return { success: false, error: "Recurring invoice tidak ditemukan" };

        await assertCanAccessClient(existing.clientId);

        const recurring = await prisma.recurringInvoice.update({
            where: { id },
            data: { isActive },
            include: { items: true, client: true },
        });
        return { success: true, data: recurring };
    } catch (error) {
        console.error("updateRecurringInvoiceStatus error:", error);
        return handleAuthError(error);
    }
}

// ─── DELETE RECURRING INVOICE ───────────────────────────────────────────────

export async function deleteRecurringInvoice(id: string) {
    try {
        const existing = await prisma.recurringInvoice.findUnique({
            where: { id },
            select: { clientId: true },
        });
        if (!existing) return { success: false, error: "Recurring invoice tidak ditemukan" };

        await assertCanAccessClient(existing.clientId);

        await prisma.recurringInvoice.delete({ where: { id } });
        return { success: true };
    } catch (error) {
        console.error("deleteRecurringInvoice error:", error);
        return handleAuthError(error);
    }
}

// ─── GENERATE INVOICES FROM RECURRING (used by cron) ────────────────────────

export async function generateRecurringInvoices() {
    const now = new Date();
    const dueRecurrings = await prisma.recurringInvoice.findMany({
        where: {
            isActive: true,
            nextRunDate: { lte: now },
        },
        include: { items: true, client: true },
    });

    let generated = 0;
    let failed = 0;
    const results: { id: string; success: boolean; error?: string }[] = [];

    for (const recurring of dueRecurrings) {
        const client = recurring.client;
        if (!client) continue;

        try {
            const subtotal = recurring.items.reduce((sum, item) => sum + item.qty * item.harga, 0);
            const ppn = round2(subtotal * TAX_CONFIG.PPN_RATE);
            const total = subtotal + ppn;

            // Due date: 30 days from generation
            const jatuhTempo = new Date(now);
            jatuhTempo.setDate(jatuhTempo.getDate() + 30);

            // Atomic invoice number generation inside transaction
            const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
            const counterKey = `INV-${dateStr}`;

            await prisma.$transaction(async (tx) => {
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
                const nomorInvoice = `INV-${dateStr}-${seq.toString().padStart(3, "0")}`;

                const createdInvoice = await tx.invoice.create({
                    data: {
                        nomorInvoice,
                        clientId: recurring.clientId,
                        clientName: client.nama,
                        tanggal: new Date(),
                        jatuhTempo,
                        subtotal,
                        ppn,
                        total,
                        status: InvoiceStatus.Terkirim,
                        catatan: recurring.catatan || null,
                        recurringInvoiceId: recurring.id,
                        items: {
                            create: recurring.items.map((item) => ({
                                deskripsi: item.deskripsi,
                                qty: item.qty,
                                harga: item.harga,
                                jumlah: item.qty * item.harga,
                            })),
                        },
                    },
                });

                // Auto-journal for recurring invoice (Piutang/Pendapatan/PPN)
                const journalResult = await createInvoiceSentJournal(tx, {
                    id: createdInvoice.id,
                    nomorInvoice,
                    clientId: recurring.clientId,
                    subtotal,
                    ppn,
                    total,
                    tanggal: new Date(),
                });
                if (!journalResult.success) {
                    console.warn(`[generateRecurring] Auto-journal failed for ${nomorInvoice}:`, journalResult.error);
                }

                // Advance nextRunDate atomically within transaction
                const nextRunDate = calculateNextRunDate(recurring.interval, recurring.nextRunDate);
                await tx.recurringInvoice.update({
                    where: { id: recurring.id },
                    data: { nextRunDate },
                });
            });

            generated++;
            results.push({ id: recurring.id, success: true });
        } catch (error) {
            console.error(`[generateRecurring] Failed for recurring ${recurring.id}:`, error);
            failed++;
            results.push({
                id: recurring.id,
                success: false,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    return { generated, failed, results };
}
