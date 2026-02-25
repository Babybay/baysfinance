"use server";

import { prisma } from "@/lib/prisma";

// ─── GET INVOICES ────────────────────────────────────────────────────────────

export async function getInvoices(clientId?: string) {
    try {
        const invoices = await prisma.invoice.findMany({
            where: clientId ? { clientId } : undefined,
            include: { items: true },
            orderBy: { tanggal: "desc" },
        });
        return { success: true, data: invoices };
    } catch (error) {
        console.error("getInvoices error:", error);
        return { success: false, data: [] };
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
        const client = await prisma.client.findUnique({ where: { id: data.clientId } });
        if (!client) return { success: false, error: "Klien tidak ditemukan" };

        const subtotal = data.items.reduce((sum, item) => sum + item.qty * item.harga, 0);
        const ppn = Math.round(subtotal * 0.11);
        const total = subtotal + ppn;

        // Generate invoice number
        const count = await prisma.invoice.count();
        const nomorInvoice = `INV-2026-${String(count + 1).padStart(3, "0")}`;

        const invoice = await prisma.invoice.create({
            data: {
                nomorInvoice,
                clientId: data.clientId,
                clientName: client.nama,
                tanggal: new Date(),
                jatuhTempo: new Date(data.jatuhTempo),
                subtotal,
                ppn,
                total,
                status: "Draft",
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

        return { success: true, data: invoice };
    } catch (error) {
        console.error("createInvoice error:", error);
        return { success: false, error: "Gagal membuat invoice" };
    }
}

// ─── UPDATE INVOICE STATUS ───────────────────────────────────────────────────

export async function updateInvoiceStatus(id: string, status: string) {
    try {
        const invoice = await prisma.invoice.update({
            where: { id },
            data: { status },
            include: { items: true },
        });
        return { success: true, data: invoice };
    } catch (error) {
        console.error("updateInvoiceStatus error:", error);
        return { success: false, error: "Gagal mengupdate status invoice" };
    }
}

// ─── DELETE INVOICE ──────────────────────────────────────────────────────────

export async function deleteInvoice(id: string) {
    try {
        await prisma.invoice.delete({ where: { id } });
        return { success: true };
    } catch (error) {
        console.error("deleteInvoice error:", error);
        return { success: false, error: "Gagal menghapus invoice" };
    }
}
