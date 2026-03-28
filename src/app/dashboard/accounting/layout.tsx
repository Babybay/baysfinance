import React from "react";
import { getClients } from "@/app/actions/clients";
import { AccountingLayoutClient } from "./AccountingLayoutClient";

export default async function AccountingLayout({ children }: { children: React.ReactNode }) {
    const clientsRes = await getClients();
    const clients = (clientsRes.success ? clientsRes.data : []).map((c: any) => ({
        id: c.id,
        nama: c.nama,
    }));

    return (
        <AccountingLayoutClient clients={clients}>
            {children}
        </AccountingLayoutClient>
    );
}
