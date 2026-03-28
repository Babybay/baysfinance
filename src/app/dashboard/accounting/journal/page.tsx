import React from "react";
import { JournalEntriesListView } from "./JournalEntriesListView";
import { getAccounts } from "@/app/actions/accounting";
import { Account } from "@/lib/data";

export default async function JournalPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string; ref?: string }>;
}) {
    const { page: pageParam, ref: refParam } = await searchParams;
    const page = Math.max(1, parseInt(pageParam || "1", 10));

    const accountsRes = await getAccounts();
    const accounts = (accountsRes.success ? accountsRes.data : []) as unknown as Account[];

    return (
        <JournalEntriesListView
            initialEntries={[]}
            accounts={accounts}
            total={0}
            page={page}
            pageSize={20}
            initialSearch={refParam || ""}
        />
    );
}
