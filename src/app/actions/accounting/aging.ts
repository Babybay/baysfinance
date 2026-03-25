"use server";

import { prisma } from "@/lib/prisma";
import { InvoiceStatus } from "@prisma/client";
import {
    assertCanAccessClient,
    handleAuthError,
    isAdminOrStaff,
} from "@/lib/auth-helpers";

// ── Types ────────────────────────────────────────────────────────────────────

export interface AgingInvoice {
    nomorInvoice: string;
    clientName: string;
    total: number;
    totalPaid: number;
    remaining: number;
    jatuhTempo: string;
    daysOverdue: number;
}

export interface AgingBucket {
    label: string;
    invoiceCount: number;
    totalAmount: number;
    invoices: AgingInvoice[];
}

export interface AgingData {
    buckets: AgingBucket[];
    grandTotal: number;
    totalInvoices: number;
}

// ── Server Action ────────────────────────────────────────────────────────────

export async function getInvoiceAging(
    clientId?: string
): Promise<{ success: boolean; data?: AgingData; error?: string }> {
    try {
        if (clientId) {
            await assertCanAccessClient(clientId);
        } else {
            const admin = await isAdminOrStaff();
            if (!admin) {
                return { success: false, error: "Akses ditolak." };
            }
        }

        const invoices = await prisma.invoice.findMany({
            where: {
                status: { in: [InvoiceStatus.Terkirim, InvoiceStatus.JatuhTempo] },
                deletedAt: null,
                ...(clientId ? { clientId } : {}),
            },
            include: {
                payments: {
                    where: { deletedAt: null },
                    select: { jumlah: true },
                },
            },
            orderBy: { jatuhTempo: "asc" },
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const bucketDefs: { label: string; min: number; max: number }[] = [
            { label: "Current", min: -Infinity, max: 0 },
            { label: "1-30 days", min: 1, max: 30 },
            { label: "31-60 days", min: 31, max: 60 },
            { label: "61-90 days", min: 61, max: 90 },
            { label: "90+ days", min: 91, max: Infinity },
        ];

        const buckets: AgingBucket[] = bucketDefs.map((def) => ({
            label: def.label,
            invoiceCount: 0,
            totalAmount: 0,
            invoices: [],
        }));

        for (const inv of invoices) {
            const dueDate = new Date(inv.jatuhTempo);
            dueDate.setHours(0, 0, 0, 0);
            const daysOverdue = Math.floor(
                (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
            );

            const totalPaid = inv.payments.reduce(
                (sum, p) => sum + p.jumlah,
                0
            );
            const remaining = inv.total - totalPaid;

            const agingInvoice: AgingInvoice = {
                nomorInvoice: inv.nomorInvoice,
                clientName: inv.clientName,
                total: inv.total,
                totalPaid,
                remaining,
                jatuhTempo: inv.jatuhTempo.toISOString(),
                daysOverdue,
            };

            // Find the correct bucket
            const bucketIndex = bucketDefs.findIndex(
                (def) => daysOverdue >= def.min && daysOverdue <= def.max
            );
            if (bucketIndex !== -1) {
                buckets[bucketIndex].invoices.push(agingInvoice);
                buckets[bucketIndex].invoiceCount += 1;
                buckets[bucketIndex].totalAmount += remaining;
            }
        }

        const grandTotal = buckets.reduce((sum, b) => sum + b.totalAmount, 0);
        const totalInvoices = buckets.reduce(
            (sum, b) => sum + b.invoiceCount,
            0
        );

        return {
            success: true,
            data: { buckets, grandTotal, totalInvoices },
        };
    } catch (error) {
        console.error("[getInvoiceAging]", error);
        if (
            error instanceof Error &&
            (error.message === "UNAUTHENTICATED" ||
                error.message === "FORBIDDEN")
        ) {
            return handleAuthError(error);
        }
        return { success: false, error: "Gagal memuat data aging." };
    }
}
