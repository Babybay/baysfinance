import React from "react";
import { AccountsView } from "./AccountsView";
import { getAccounts } from "@/app/actions/accounting";
import { Account } from "@/lib/data";

export default async function AccountsPage() {
    const res = await getAccounts();
    const accounts = (res.success ? res.data : []) as unknown as Account[];

    return <AccountsView accounts={accounts} />;
}
