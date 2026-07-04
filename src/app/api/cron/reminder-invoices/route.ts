import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { InvoiceStatus } from "@prisma/client";
import { filterAndLogNew } from "@/lib/notifications";
import { createLogger } from "@/lib/logger";

const log = createLogger("cron:reminder-invoices");

/**
 * Returns invoices that are overdue and unpaid for 7+ days.
 * Only includes invoices with status Terkirim or JatuhTempo
 * whose jatuhTempo (due date) is at least 7 days in the past.
 *
 * n8n calls this daily, gets the list, and sends payment reminders.
 *
 * Protected by CRON_SECRET (enforced in proxy.ts).
 */
export async function GET() {
    try {
        const now = new Date();
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const overdueInvoices = await prisma.invoice.findMany({
            where: {
                status: { in: [InvoiceStatus.Terkirim, InvoiceStatus.JatuhTempo] },
                jatuhTempo: { lt: sevenDaysAgo },
            },
            include: {
                client: { select: { id: true, nama: true, email: true, telepon: true } },
            },
            orderBy: { jatuhTempo: "asc" },
        });

        const items = overdueInvoices.map((inv) => {
            const daysOverdue = Math.floor(
                (now.getTime() - inv.jatuhTempo.getTime()) / (1000 * 60 * 60 * 24),
            );
            return {
                id: inv.id,
                clientId: inv.clientId,
                clientName: inv.client.nama,
                clientEmail: inv.client.email,
                clientPhone: inv.client.telepon,
                nomorInvoice: inv.nomorInvoice,
                total: inv.total.toString(),
                jatuhTempo: inv.jatuhTempo.toISOString(),
                daysOverdue,
                namaBank: inv.namaBank,
                nomorRekening: inv.nomorRekening,
                atasNama: inv.atasNama,
            };
        });

        const newItems = await filterAndLogNew("invoice_overdue_7", items);

        log.info({ total: newItems.length }, "Invoice overdue reminders generated");

        return NextResponse.json({
            success: true,
            count: newItems.length,
            reminders: newItems,
        });
    } catch (error) {
        log.error({ err: error }, "Failed to generate invoice reminders");
        return NextResponse.json(
            { success: false, error: "Failed to generate invoice reminders" },
            { status: 500 },
        );
    }
}
