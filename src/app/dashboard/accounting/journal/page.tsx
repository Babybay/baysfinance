import React from "react";
import { JournalEntriesListView } from "./JournalEntriesListView";
import { getJournalEntries, getAccounts } from "@/app/actions/accounting";
import { getClients } from "@/app/actions/clients";
import { JournalEntry, Account, Client } from "@/lib/data";

export default async function JournalPage() {
    const [entriesRes, clientsRes, accountsRes] = await Promise.all([
        getJournalEntries(),
        getClients(),
        getAccounts()
    ]);

    const initialEntries = (entriesRes.success ? entriesRes.data : []) as unknown as JournalEntry[];
    const clients = (clientsRes.success ? clientsRes.data : []) as unknown as Client[];
    const accounts = (accountsRes.success ? accountsRes.data : []) as unknown as Account[];

    return (
        <JournalEntriesListView
            initialEntries={initialEntries}
            clients={clients}
            accounts={accounts}
        />
    );
}
