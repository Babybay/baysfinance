import React from "react";
import { BukuBesarView } from "@/components/accounting/BukuBesarView";
import { getAccounts } from "@/app/actions/accounting";

export default async function BukuBesarPage({
    searchParams,
}: {
    searchParams: Promise<{ account?: string }>;
}) {
    const { account: accountParam } = await searchParams;
    const accountsRes = await getAccounts();

    const accounts = (accountsRes.success ? accountsRes.data : []) as {
        id: string;
        code: string;
        name: string;
    }[];

    return <BukuBesarView accounts={accounts} initialAccount={accountParam || ""} />;
}
