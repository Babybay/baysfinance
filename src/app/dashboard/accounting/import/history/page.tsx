import React from "react";
import { ImportHistoryView } from "./ImportHistoryView";
import { getClients } from "@/app/actions/clients";
import { getImportHistory } from "@/app/actions/import-accounting";
import { Client } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";

export default async function ImportHistoryPage() {
    const user = await getCurrentUser();
    if (!user) redirect("/sign-in");

    const role = user.role.toLowerCase();
    const ownClientId = user.clientId;
    const isClientRole = role === "client";

    const clientsRes = await getClients();
    const clients = (clientsRes.success ? clientsRes.data : []) as unknown as Client[];

    const resolvedClientId = isClientRole ? (ownClientId ?? "") : "";

    let initialHistory: Awaited<ReturnType<typeof getImportHistory>>["data"] = [];
    let initialTotal = 0;
    if (resolvedClientId) {
        const histRes = await getImportHistory(resolvedClientId);
        initialHistory = histRes.data;
        initialTotal = histRes.total;
    }

    return (
        <ImportHistoryView
            clients={clients}
            defaultClientId={resolvedClientId}
            isClientRole={isClientRole}
            initialHistory={initialHistory}
            initialTotal={initialTotal}
        />
    );
}
