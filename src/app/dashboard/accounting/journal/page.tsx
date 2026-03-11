import React from "react";
import { JournalEntriesListView } from "./JournalEntriesListView";
import { getJournalEntries, getAccounts } from "@/app/actions/accounting";
import { getClients } from "@/app/actions/clients";
import { JournalEntry, Account, Client } from "@/lib/data";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

const PAGE_SIZE = 20;

export default async function JournalPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string; clientId?: string }>;
}) {
    const user = await currentUser();
    if (!user) redirect("/sign-in");

    const role = (user.publicMetadata?.role as string) || "client";
    const ownClientId = user.publicMetadata?.clientId as string | undefined;

    const { page: pageParam, clientId: clientIdParam } = await searchParams;
    const page = Math.max(1, parseInt(pageParam || "1", 10));

    // For client-role users, always scope to their own clientId.
    // Admin users must pick a client via the UI (clientId param from URL/state).
    const resolvedClientId =
        role === "admin" || role === "staff"
            ? (clientIdParam ?? "")
            : (ownClientId ?? "");

    const [entriesRes, clientsRes, accountsRes] = await Promise.all([
        resolvedClientId
            ? getJournalEntries(resolvedClientId, page, PAGE_SIZE)
            : Promise.resolve({ success: true, data: [], total: 0, page, pageSize: PAGE_SIZE }),
        getClients(),
        resolvedClientId ? getAccounts(resolvedClientId) : getAccounts(),
    ]);

    const initialEntries = (entriesRes.success ? entriesRes.data : []) as unknown as JournalEntry[];
    const total = (entriesRes as { total?: number }).total ?? 0;
    const clients = (clientsRes.success ? clientsRes.data : []) as unknown as Client[];
    const accounts = (accountsRes.success ? accountsRes.data : []) as unknown as Account[];

    return (
        <JournalEntriesListView
            initialEntries={initialEntries}
            clients={clients}
            accounts={accounts}
            total={total}
            page={page}
            pageSize={PAGE_SIZE}
            defaultClientId={resolvedClientId}
            isClientRole={role === "client"}
        />
    );
}
