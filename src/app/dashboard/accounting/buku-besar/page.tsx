import React from "react";
import { BukuBesarView } from "@/components/accounting/BukuBesarView";
import { getAccounts } from "@/app/actions/accounting";
import { getClients } from "@/app/actions/clients";
import { Client } from "@/lib/data";

export default async function BukuBesarPage() {
    const [accountsRes, clientsRes] = await Promise.all([
        getAccounts(),
        getClients(),
    ]);

    const accounts = (accountsRes.success ? accountsRes.data : []) as {
        id: string;
        code: string;
        name: string;
    }[];
    const clients = (clientsRes.success ? clientsRes.data : []) as unknown as Client[];

    return <BukuBesarView clients={clients} accounts={accounts} />;
}
