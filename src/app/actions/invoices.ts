"use server";

import { prisma } from "@/lib/prisma";
import { InvoiceStatus, Prisma } from "@prisma/client";
import {
    assertCanAccessClient,
    handleAuthError,
    isAdminOrStaff,
} from "@/lib/auth-helpers";
import { createInvoiceSentJournal } from "@/lib/auto-journal";

// ─── VALID STATUS TRANSITIONS ───────────────────────────────────────────────

const VALID_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
    [InvoiceStatus.Draft]: [InvoiceStatus.Terkirim],
    [InvoiceStatus.Terkirim]: [InvoiceStatus.Lunas, InvoiceStatus.JatuhTempo],
    [InvoiceStatus.JatuhTempo]: [InvoiceStatus.Lunas],
    [InvoiceStatus.Lunas]: [],
};

// ─── GET INVOICES ────────────────────────────────────────────────────────────

export async function getInvoices(clientId?: string) {
    try {
        if (clientId) {
            await assertCanAccessClient(clientId);
        } else {
            const admin = await isAdminOrStaff();
            if (!admin) return { success: false, data: [], error: "Akses ditolak." };
        }

        const invoices = await prisma.invoice.findMany({
            where: clientId ? { clientId } : undefined,
            include: { items: true },
            orderBy: { tanggal: "desc" },
        });
        return { success: true, data: invoices };
    } catch (error) {
        console.error("getInvoices error:", error);
        return { ...handleAuthError(error), data: [] };
    }
}

// ─── CREATE INVOICE ──────────────────────────────────────────────────────────

export async function createInvoice(data: {
    clientId: string;
    jatuhTempo: string;
    catatan: string;
    items: { deskripsi: string; qty: number; harga: number; jumlah: number }[];
}) {
    try {
        await assertCanAccessClient(data.clientId);

        // Server-side input validation
        if (!data.items || data.items.length === 0) {
            return { success: false, error: "Invoice harus memiliki minimal 1 item." };
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

        const subtotal = data.items.reduce((sum, item) => sum + item.qty * item.harga, 0);
        const ppn = Math.round(subtotal * 0.11);
        const total = subtotal + ppn;

        // Atomic invoice number generation (prevents race conditions)
        const now = new Date();
        const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
        const counterKey = `INV-${dateStr}`;

        const invoice = await prisma.$transaction(async (tx) => {
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

            return tx.invoice.create({
                data: {
                    nomorInvoice,
                    clientId: data.clientId,
                    clientName: client.nama,
                    tanggal: new Date(),
                    jatuhTempo: new Date(data.jatuhTempo),
                    subtotal,
                    ppn,
                    total,
                    status: InvoiceStatus.Draft,
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
                include: { items: true },
            });
        });

        return { success: true, data: invoice };
    } catch (error) {
        console.error("createInvoice error:", error);
        return handleAuthError(error);
    }
}

// ─── UPDATE INVOICE STATUS ───────────────────────────────────────────────────

export async function updateInvoiceStatus(id: string, status: InvoiceStatus) {
    try {
        const existing = await prisma.invoice.findUnique({
            where: { id },
            select: { id: true, status: true, clientId: true },
        });
        if (!existing) return { success: false, error: "Invoice tidak ditemukan" };

        await assertCanAccessClient(existing.clientId);

        // Enforce valid status transitions
        const allowed = VALID_TRANSITIONS[existing.status];
        if (!allowed.includes(status)) {
            return {
                success: false,
                error: `Tidak dapat mengubah status dari ${existing.status} ke ${status}.`,
            };
        }

        // Use transaction to atomically update status + create auto-journal
        const result = await prisma.$transaction(async (tx) => {
            const invoice = await tx.invoice.update({
                where: { id },
                data: { status },
                include: { items: true },
            });

            let journalRefNumber: string | null = null;

            // Auto-journal on Draft → Terkirim (first send)
            if (existing.status === InvoiceStatus.Draft && status === InvoiceStatus.Terkirim) {
                const journalResult = await createInvoiceSentJournal(tx, {
                    id: invoice.id,
                    nomorInvoice: invoice.nomorInvoice,
                    clientId: invoice.clientId,
                    subtotal: invoice.subtotal,
                    ppn: invoice.ppn,
                    total: invoice.total,
                    tanggal: invoice.tanggal,
                });
                if (!journalResult.success) {
                    console.warn("[updateInvoiceStatus] Auto-journal failed:", journalResult.error);
                }
                journalRefNumber = journalResult.refNumber || null;
            }

            return { invoice, journalRefNumber };
        });

        return { success: true, data: result.invoice, journalRefNumber: result.journalRefNumber };
    } catch (error) {
        console.error("updateInvoiceStatus error:", error);
        return handleAuthError(error);
    }
}

// ─── DELETE INVOICE ──────────────────────────────────────────────────────────

export async function deleteInvoice(id: string) {
    try {
        const existing = await prisma.invoice.findUnique({
            where: { id },
            select: { id: true, status: true, clientId: true },
        });
        if (!existing) return { success: false, error: "Invoice tidak ditemukan" };

        await assertCanAccessClient(existing.clientId);

        // Only Draft invoices can be deleted
        if (existing.status !== InvoiceStatus.Draft) {
            return {
                success: false,
                error: "Hanya invoice berstatus Draft yang dapat dihapus.",
            };
        }

        await prisma.invoice.delete({ where: { id } });
        return { success: true };
    } catch (error) {
        console.error("deleteInvoice error:", error);
        return handleAuthError(error);
    }
}

// ─── GET INVOICE BY ID ──────────────────────────────────────────────────────

export async function getInvoiceById(id: string) {
    try {
        const invoice = await prisma.invoice.findUnique({
            where: { id },
            include: { items: true, client: true },
        });
        if (!invoice) return { success: false, error: "Invoice tidak ditemukan" };

        await assertCanAccessClient(invoice.clientId);

        return { success: true, data: invoice };
    } catch (error) {
        console.error("getInvoiceById error:", error);
        return handleAuthError(error);
    }
}
