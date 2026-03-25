import React from "react";
import { getCurrentUser } from "@/lib/auth-helpers";
import { AccountsView } from "./AccountsView";
import { getAccounts } from "@/app/actions/accounting";
import { Account } from "@/lib/data";

export default async function AccountsPage() {
    const user = await getCurrentUser();
    const role = user?.role?.toLowerCase() || "client";
    const clientId = role === "client"
        ? user?.clientId
        : undefined;

    const res = await getAccounts(clientId, role !== "client");
    const accounts = (res.success ? res.data : []) as unknown as Account[];

    return <AccountsView accounts={accounts} role={role as "admin" | "staff" | "client"} />;
}
