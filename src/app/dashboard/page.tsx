import React from "react";
import { currentUser } from "@clerk/nextjs/server";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { ClientDashboard } from "@/components/dashboard/ClientDashboard";
import { getDashboardData } from "@/app/actions/dashboard-data";
import { prisma } from "@/lib/prisma";
import { JenisWP, ClientStatus, InvoiceStatus, TaxDeadlineStatus } from "@prisma/client";

export default async function DashboardPage() {
    const user = await currentUser();

    if (!user) {
        return null;
    }

    // Retrieve role and clientId from metadata
    const role = (user.publicMetadata?.role as string) || "client";
    const clientId = user.publicMetadata?.clientId as string | undefined;
    const isAdmin = role === "admin";

    const response = await getDashboardData(clientId, role);

    if (!response.success || !response.data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <p className="text-muted-foreground">Error loading dashboard data. Please try again later.</p>
            </div>
        );
    }

    // Map Prisma types to local types
    const formattedClients = response.data.clients.map(c => ({
        ...c,
        jenisWP: c.jenisWP as JenisWP,
        status: c.status as ClientStatus,
        createdAt: new Date(c.createdAt).toISOString().split("T")[0]
    }));

    const formattedInvoices = response.data.invoices.map(i => ({
        ...i,
        tanggal: new Date(i.tanggal).toISOString().split("T")[0],
        jatuhTempo: new Date(i.jatuhTempo).toISOString().split("T")[0],
        status: i.status as InvoiceStatus,
        items: [], // Note: items are not fetched stringently yet
        catatan: i.catatan || ""
    }));

    const formattedDeadlines = response.data.deadlines.map(d => ({
        ...d,
        tanggalBatas: new Date(d.tanggalBatas).toISOString().split("T")[0],
        status: d.status as TaxDeadlineStatus,
        clientName: d.clientName || undefined
    }));

    if (isAdmin) {
        return (
            <AdminDashboard
                clients={formattedClients}
                invoices={formattedInvoices}
                deadlines={formattedDeadlines}
            />
        );
    }

    // Client View
    const targetClient = formattedClients.find(c => c.id === clientId) || (formattedClients.length > 0 ? formattedClients[0] : null);

    return (
        <ClientDashboard
            client={targetClient}
            invoices={formattedInvoices}
            deadlines={formattedDeadlines}
        />
    );
}
