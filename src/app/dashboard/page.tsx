"use client";

import React, { useEffect, useState } from "react";
import { useRoles } from "@/lib/hooks/useRoles";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { ClientDashboard } from "@/components/dashboard/ClientDashboard";
import {
    sampleClients, sampleInvoices, sampleDeadlines,
    Client, Invoice, TaxDeadline,
    getFilteredClients, getFilteredInvoices, getFilteredDeadlines
} from "@/lib/data";

export default function DashboardPage() {
    const { role, clientId, isLoaded: roleLoaded, isAdmin } = useRoles();
    const [clients, setClients] = useState<Client[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [deadlines, setDeadlines] = useState<TaxDeadline[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (!roleLoaded) return;

        const c = localStorage.getItem("pajak_clients");
        const i = localStorage.getItem("pajak_invoices");
        const d = localStorage.getItem("pajak_deadlines");

        const allClients = c ? JSON.parse(c) : sampleClients;
        const allInvoices = i ? JSON.parse(i) : sampleInvoices;
        const allDeadlines = d ? JSON.parse(d) : sampleDeadlines;

        // Apply filtering based on role
        const currentRole = (role as "admin" | "client") || "admin";
        setClients(getFilteredClients(allClients, currentRole, clientId));
        setInvoices(getFilteredInvoices(allInvoices, currentRole, clientId));
        setDeadlines(getFilteredDeadlines(allDeadlines, currentRole, clientId));
        setIsLoaded(true);
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
