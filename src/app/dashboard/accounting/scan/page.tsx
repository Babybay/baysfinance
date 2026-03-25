import React from "react";
import { getCurrentUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { ScanPageView } from "./ScanPageView";
import { getClients } from "@/app/actions/clients";
import type { Client } from "@/lib/data";

export default async function ScanPage() {
    const user = await getCurrentUser();
    if (!user) redirect("/sign-in");

    const role = user.role.toLowerCase();
    const ownClientId = user.clientId;

    const clientsRes = await getClients();
    const clients = (clientsRes.success ? clientsRes.data : []) as unknown as Client[];

    const resolvedClientId = role === "client" ? (ownClientId ?? "") : "";

    return (
        <ScanPageView
            clients={clients}
            defaultClientId={resolvedClientId}
        />
    );
}
