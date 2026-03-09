"use server";

import { prisma } from "@/lib/prisma";
import { formatIDR } from "@/lib/data";
import { PermitCaseStatus, ClientStatus, InvoiceStatus } from "@prisma/client";

export async function getDashboardStats() {
    try {
        const clients = await prisma.client.count();
        const activeClients = await prisma.client.count({
            where: { status: ClientStatus.Aktif }
        });

        const invoices = await prisma.invoice.findMany({
            where: { status: InvoiceStatus.Terkirim },
            select: { total: true }
        });
        const totalPendingInvoice = invoices.reduce((acc, inv) => acc + inv.total, 0);

        const permits = await prisma.permitCase.count({
            where: {
                status: {
                    in: [PermitCaseStatus.Processing, PermitCaseStatus.WaitingDocument]
                }
            }
        });

        return {
            totalClients: clients,
            activeClients,
            totalPendingInvoice: totalPendingInvoice,
            formattedPendingInvoice: formatIDR(totalPendingInvoice),
            activePermits: permits
        };
    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        return {
            totalClients: 0,
            activeClients: 0,
            totalPendingInvoice: 0,
            formattedPendingInvoice: formatIDR(0),
            activePermits: 0
        };
    }
}
