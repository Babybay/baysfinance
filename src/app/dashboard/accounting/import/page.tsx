import React from "react";
import { ImportView } from "./ImportView";
import { getClients } from "@/app/actions/clients";
import { Client } from "@/lib/data";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function ImportPage() {
    const user = await currentUser();
    if (!user) redirect("/sign-in");

    const role = (user.publicMetadata?.role as string) || "client";
    const ownClientId = user.publicMetadata?.clientId as string | undefined;
    const isClientRole = role === "client";

    const clientsRes = await getClients();
    const clients = (clientsRes.success ? clientsRes.data : []) as unknown as Client[];

    const resolvedClientId = isClientRole ? (ownClientId ?? "") : "";

    return (
        <ImportView
            clients={clients}
            defaultClientId={resolvedClientId}
            isClientRole={isClientRole}
        />
    );
}
