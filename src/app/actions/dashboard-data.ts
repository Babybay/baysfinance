"use server";

import { prisma } from "@/lib/prisma";
import type { Invoice, TaxDeadline, Client } from "@prisma/client";

export async function getDashboardData(clientId?: string, role: string = "admin") {
    try {
        let clients: Client[] = [];
        let invoices: Invoice[] = [];
        let deadlines: TaxDeadline[] = [];

        if (role === "admin") {
            // Fetch all for admin
            clients = await prisma.client.findMany({
                orderBy: { createdAt: "desc" }
            });
            invoices = await prisma.invoice.findMany({
                orderBy: { tanggal: "desc" },
                take: 20 // Limit initial load for performance
            });
            deadlines = await prisma.taxDeadline.findMany({
                orderBy: { tanggalBatas: "asc" }
            });
        } else if (clientId) {
            // Fetch only for specific client
            clients = await prisma.client.findMany({ where: { id: clientId } });
            invoices = await prisma.invoice.findMany({
                where: { clientId },
                orderBy: { tanggal: "desc" },
                take: 20
            });
            deadlines = await prisma.taxDeadline.findMany({
                where: { clientId },
                orderBy: { tanggalBatas: "asc" }
            });
        }

        return { success: true, data: { clients, invoices, deadlines } };
    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        return { success: false, data: { clients: [], invoices: [], deadlines: [] } };
    }
}
