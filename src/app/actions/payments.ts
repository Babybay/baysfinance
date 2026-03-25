"use server";

import { prisma } from "@/lib/prisma";
import { InvoiceStatus, Prisma } from "@prisma/client";
import {
    assertCanAccessClient,
    getCurrentUser,
    handleAuthError,
} from "@/lib/auth-helpers";
import { writeAuditLog } from "@/lib/audit";
import {
    createPaymentReceivedJournal,
    createPaymentReversalJournal,
} from "@/lib/auto-journal";

// ─── GET PAYMENTS BY INVOICE ────────────────────────────────────────────────

export async function getPaymentsByInvoice(invoiceId: string) {
    try {
        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            select: { id: true, clientId: true, total: true },
        });
        if (!invoice) return { success: false, data: [], totalPaid: 0, remaining: 0, error: "Invoice tidak ditemukan" };

        await assertCanAccessClient(invoice.clientId);

        const payments = await prisma.payment.findMany({
            where: { invoiceId },
            orderBy: { tanggalBayar: "desc" },
        });

        const totalPaid = payments.reduce((sum, p) => sum + p.jumlah, 0);
        const remaining = Math.max(0, invoice.total - totalPaid);

        return {
            success: true,
            data: payments.map((p) => ({
                ...p,
                tanggalBayar: p.tanggalBayar.toISOString(),
                createdAt: p.createdAt.toISOString(),
                updatedAt: p.updatedAt.toISOString(),
            })),
            totalPaid,
            remaining,
        };
    } catch (error) {
        console.error("[getPaymentsByInvoice]", error);
        return { ...handleAuthError(error), data: [], totalPaid: 0, remaining: 0 };
    }
}

// ─── RECORD PAYMENT ─────────────────────────────────────────────────────────

export async function recordPayment(data: {
    invoiceId: string;
    jumlah: number;
    tanggalBayar: string;
    metodePembayaran: string;
    catatan?: string;
}) {
    try {
        // Load invoice
        const invoice = await prisma.invoice.findUnique({
            where: { id: data.invoiceId },
            select: {
                id: true,
                clientId: true,
                nomorInvoice: true,
                total: true,
                status: true,
            },
        });
        if (!invoice) return { success: false, error: "Invoice tidak ditemukan" };

        await assertCanAccessClient(invoice.clientId);

        // Only allow payments on sent/overdue invoices
        if (invoice.status !== InvoiceStatus.Terkirim && invoice.status !== InvoiceStatus.JatuhTempo) {
            return {
                success: false,
                error: `Tidak dapat mencatat pembayaran untuk invoice berstatus ${invoice.status}.`,
            };
        }

        // Validate amount
        if (typeof data.jumlah !== "number" || data.jumlah <= 0) {
            return { success: false, error: "Jumlah pembayaran harus lebih dari 0." };
        }
        if (data.jumlah > 999_999_999_999) {
            return { success: false, error: "Jumlah pembayaran melebihi batas maksimum." };
        }

        // Calculate remaining balance
        const existingSum = await prisma.payment.aggregate({
            where: { invoiceId: data.invoiceId },
            _sum: { jumlah: true },
        });
        const totalPaidBefore = existingSum._sum.jumlah ?? 0;
        const remaining = invoice.total - totalPaidBefore;

        if (data.jumlah > remaining + 0.01) {
            return {
                success: false,
                error: `Jumlah pembayaran (${data.jumlah}) melebihi sisa tagihan (${remaining}).`,
            };
        }

        const user = await getCurrentUser();

        // Single atomic transaction: create payment + journal + auto-Lunas
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create payment
            const payment = await tx.payment.create({
                data: {
                    invoiceId: data.invoiceId,
                    createdBy: user?.id,
                    jumlah: data.jumlah,
                    tanggalBayar: new Date(data.tanggalBayar),
                    metodePembayaran: data.metodePembayaran,
                    catatan: data.catatan || null,
                },
            });

            // 2. Create auto-journal (Bank debit, Piutang credit)
            const journalResult = await createPaymentReceivedJournal(
                tx,
                { id: payment.id, jumlah: data.jumlah, tanggalBayar: new Date(data.tanggalBayar) },
                { nomorInvoice: invoice.nomorInvoice, clientId: invoice.clientId }
            );

            // Log journal errors but don't fail the payment
            if (!journalResult.success) {
                console.warn("[recordPayment] Auto-journal failed:", journalResult.error);
            }

            // 3. Check if fully paid → auto-Lunas
            const allPaymentsSum = await tx.payment.aggregate({
                where: { invoiceId: data.invoiceId },
                _sum: { jumlah: true },
            });
            const totalPaidAfter = allPaymentsSum._sum.jumlah ?? 0;
            const autoLunas = totalPaidAfter >= invoice.total - 0.01;

            if (autoLunas) {
                await tx.invoice.update({
                    where: { id: data.invoiceId },
                    data: { status: InvoiceStatus.Lunas },
                });
            }

            return {
                payment: {
                    ...payment,
                    tanggalBayar: payment.tanggalBayar.toISOString(),
                    createdAt: payment.createdAt.toISOString(),
                    updatedAt: payment.updatedAt.toISOString(),
                },
                autoLunas,
                journalRefNumber: journalResult.refNumber || null,
            };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

        writeAuditLog({
            action: "CREATE",
            model: "Payment",
            recordId: result.payment.id,
            clientId: invoice.clientId,
            after: { jumlah: data.jumlah, invoiceId: data.invoiceId, autoLunas: result.autoLunas },
        });

        return { success: true, data: result };
    } catch (error) {
        console.error("[recordPayment]", error);
        return handleAuthError(error);
    }
}

// ─── DELETE PAYMENT ─────────────────────────────────────────────────────────

export async function deletePayment(paymentId: string) {
    try {
        const payment = await prisma.payment.findUnique({
            where: { id: paymentId },
            include: {
                invoice: {
                    select: { id: true, clientId: true, nomorInvoice: true, total: true, status: true },
                },
            },
        });
        if (!payment) return { success: false, error: "Pembayaran tidak ditemukan" };

        await assertCanAccessClient(payment.invoice.clientId);

        await prisma.$transaction(async (tx) => {
            // 1. Soft-delete payment
            await tx.payment.delete({ where: { id: paymentId } });

            // 2. Create reversing journal
            const reversalResult = await createPaymentReversalJournal(
                tx,
                { id: payment.id, jumlah: payment.jumlah, tanggalBayar: payment.tanggalBayar },
                { nomorInvoice: payment.invoice.nomorInvoice, clientId: payment.invoice.clientId }
            );
            if (!reversalResult.success) {
                console.warn("[deletePayment] Reversal journal failed:", reversalResult.error);
            }

            // 3. Recalculate: if invoice was Lunas, revert status
            if (payment.invoice.status === InvoiceStatus.Lunas) {
                const remainingSum = await tx.payment.aggregate({
                    where: { invoiceId: payment.invoiceId },
                    _sum: { jumlah: true },
                });
                const totalPaidAfter = remainingSum._sum.jumlah ?? 0;

                if (totalPaidAfter < payment.invoice.total - 0.01) {
                    // Check if overdue
                    const inv = await tx.invoice.findUnique({
                        where: { id: payment.invoiceId },
                        select: { jatuhTempo: true },
                    });
                    const isOverdue = inv && inv.jatuhTempo < new Date();

                    await tx.invoice.update({
                        where: { id: payment.invoiceId },
                        data: {
                            status: isOverdue ? InvoiceStatus.JatuhTempo : InvoiceStatus.Terkirim,
                        },
                    });
                }
            }
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

        return { success: true };
    } catch (error) {
        console.error("[deletePayment]", error);
        return handleAuthError(error);
    }
}
