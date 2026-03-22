"use server";

import { prisma } from "@/lib/prisma";
import { InvoiceStatus, RecurringInterval } from "@prisma/client";

// ─── GET RECURRING INVOICES ─────────────────────────────────────────────────

export async function getRecurringInvoices(clientId?: string) {
    try {
        const where = clientId ? { clientId } : {};
        const recurring = await prisma.recurringInvoice.findMany({
            where,
            include: { items: true, client: true },
            orderBy: { nextRunDate: "asc" },
        });
        return { success: true, data: recurring };
    } catch (error) {
        console.error("getRecurringInvoices error:", error);
        return { success: false, data: [], error: "Gagal mengambil data recurring invoice" };
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
        return { success: false, error: "Gagal membuat recurring invoice" };
    }
}

// ─── UPDATE RECURRING INVOICE STATUS ────────────────────────────────────────

export async function updateRecurringInvoiceStatus(id: string, isActive: boolean) {
    try {
        const recurring = await prisma.recurringInvoice.update({
            where: { id },
            data: { isActive },
            include: { items: true, client: true },
        });
        return { success: true, data: recurring };
    } catch (error) {
        console.error("updateRecurringInvoiceStatus error:", error);
        return { success: false, error: "Gagal mengupdate status recurring invoice" };
    }
}

// ─── DELETE RECURRING INVOICE ───────────────────────────────────────────────

export async function deleteRecurringInvoice(id: string) {
    try {
        await prisma.recurringInvoice.delete({ where: { id } });
        return { success: true };
    } catch (error) {
        console.error("deleteRecurringInvoice error:", error);
        return { success: false, error: "Gagal menghapus recurring invoice" };
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

    for (const recurring of dueRecurrings) {
        const client = recurring.client;
        if (!client) continue;

        const subtotal = recurring.items.reduce((sum, item) => sum + item.qty * item.harga, 0);
        const ppn = Math.round(subtotal * 0.11);
        const total = subtotal + ppn;

        // Generate invoice number
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const prefix = `INV-${yyyy}${mm}`;
        const count = await prisma.invoice.count({
            where: { nomorInvoice: { startsWith: prefix } },
        });
        const nomorInvoice = `${prefix}-${String(count + 1).padStart(3, "0")}`;

        // Due date: 30 days from generation
        const jatuhTempo = new Date(now);
        jatuhTempo.setDate(jatuhTempo.getDate() + 30);

        await prisma.invoice.create({
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

        // Advance nextRunDate
        const nextRunDate = calculateNextRunDate(recurring.interval, recurring.nextRunDate);
        await prisma.recurringInvoice.update({
            where: { id: recurring.id },
            data: { nextRunDate },
        });

        generated++;
    }

    return { generated };
}
