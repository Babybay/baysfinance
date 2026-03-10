import React from "react";
import { LedgerView } from "./LedgerView";
import { getAccounts } from "@/app/actions/accounting";
import { getClients } from "@/app/actions/clients";
import { Account, Client } from "@/lib/data";

export default async function LedgerPage() {
    const [accountsRes, clientsRes] = await Promise.all([
        getAccounts(),
        getClients()
    ]);

    const accounts = (accountsRes.success ? accountsRes.data : []) as unknown as Account[];
    const clients = (clientsRes.success ? clientsRes.data : []) as unknown as Client[];

    return <LedgerView accounts={accounts} clients={clients} />;
}
