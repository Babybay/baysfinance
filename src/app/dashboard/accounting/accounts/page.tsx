import React from "react";
import { currentUser } from "@clerk/nextjs/server";
import { AccountsView } from "./AccountsView";
import { getAccounts } from "@/app/actions/accounting";
import { Account } from "@/lib/data";

export default async function AccountsPage() {
    const user = await currentUser();
    const role = (user?.publicMetadata?.role as string) || "client";
    const clientId = role === "client"
        ? (user?.publicMetadata?.clientId as string | undefined)
        : undefined;

    const res = await getAccounts(clientId, role !== "client");
    const accounts = (res.success ? res.data : []) as unknown as Account[];

    return <AccountsView accounts={accounts} role={role as "admin" | "staff" | "client"} />;
}
