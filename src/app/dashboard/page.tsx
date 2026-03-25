import React from "react";
import { getCurrentUser } from "@/lib/auth-helpers";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { ClientDashboard } from "@/components/dashboard/ClientDashboard";
import { getDashboardData } from "@/app/actions/dashboard-data";
import { JenisWP, ClientStatus, InvoiceStatus, TaxDeadlineStatus } from "@prisma/client";

export default async function DashboardPage() {
    const user = await getCurrentUser();

    if (!user) {
        return null;
    }

    // Retrieve role and clientId from metadata
    const role = user.role.toLowerCase();
    const clientId = user.clientId;
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
        items: [],
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
                permitSummary={response.data.permitSummary}
                monthlyRevenue={response.data.monthlyRevenue}
                recentActivity={response.data.recentActivity}
                documentCount={response.data.documentCount}
                importBatchCount={response.data.importBatchCount}
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
