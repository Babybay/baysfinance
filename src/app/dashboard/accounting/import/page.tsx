import React from "react";
import { ImportTabsView } from "./ImportTabsView";
import { getClients } from "@/app/actions/clients";
import { Client } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";

export default async function ImportPage() {
    const user = await getCurrentUser();
    if (!user) redirect("/sign-in");

    const role = user.role.toLowerCase();
    const ownClientId = user.clientId;
    const isClientRole = role === "client";

    const clientsRes = await getClients();
    const clients = (clientsRes.success ? clientsRes.data : []) as unknown as Client[];

    const resolvedClientId = isClientRole ? (ownClientId ?? "") : "";

    return (
        <ImportTabsView
            clients={clients}
            defaultClientId={resolvedClientId}
            isClientRole={isClientRole}
        />
    );
}
