"use client";

import React, { useEffect, useState } from "react";
import { useRoles } from "@/lib/hooks/useRoles";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { ClientDashboard } from "@/components/dashboard/ClientDashboard";
import { getDashboardData } from "@/app/actions/dashboard-data";
import {
    Client, Invoice, TaxDeadline
} from "@/lib/data";

export default function DashboardPage() {
    const { role, clientId, isLoaded: roleLoaded, isAdmin } = useRoles();
    const [clients, setClients] = useState<Client[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [deadlines, setDeadlines] = useState<TaxDeadline[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const loadDashboardData = async () => {
            if (!roleLoaded) return;
            setIsLoaded(false);

            const currentRole = (role as string) || "admin";
            const response = await getDashboardData(clientId, currentRole);

            if (response.success && response.data) {
                // Map Prisma types to local types
                const formattedClients = response.data.clients.map(c => ({
                    ...c,
                    jenisWP: c.jenisWP as "Orang Pribadi" | "Badan",
                    status: c.status as "Aktif" | "Tidak Aktif",
                    createdAt: new Date(c.createdAt).toISOString().split("T")[0]
                }));

                const formattedInvoices = response.data.invoices.map(i => ({
                    ...i,
                    tanggal: new Date(i.tanggal).toISOString().split("T")[0],
                    jatuhTempo: new Date(i.jatuhTempo).toISOString().split("T")[0],
                    status: i.status as "Draft" | "Terkirim" | "Lunas" | "Jatuh Tempo",
                    items: [], // Note: items are not fetched stringently yet
                    catatan: i.catatan || ""
                }));

                const formattedDeadlines = response.data.deadlines.map(d => ({
                    ...d,
                    tanggalBatas: new Date(d.tanggalBatas).toISOString().split("T")[0],
                    status: d.status as "Sudah Lapor" | "Belum Lapor" | "Terlambat",
                    clientName: d.clientName || undefined
                }));

                setClients(formattedClients);
                setInvoices(formattedInvoices);
                setDeadlines(formattedDeadlines);
            }

            setIsLoaded(true);
        };

        loadDashboardData();
    }, [roleLoaded, role, clientId]);

    if (!roleLoaded || !isLoaded) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
            </div>
        );
    }

    if (isAdmin) {
        return (
            <AdminDashboard
                clients={clients}
                invoices={invoices}
                deadlines={deadlines}
            />
        );
    }

    // Client View
    const targetClient = clients.find(c => c.id === clientId) || (clients.length > 0 ? clients[0] : null);

    return (
        <ClientDashboard
            client={targetClient}
            invoices={invoices}
            deadlines={deadlines}
        />
    );
}
