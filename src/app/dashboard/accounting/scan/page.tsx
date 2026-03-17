import React from "react";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ScanPageView } from "./ScanPageView";
import { getClients } from "@/app/actions/clients";
import type { Client } from "@/lib/data";

export default async function ScanPage() {
    const user = await currentUser();
    if (!user) redirect("/sign-in");

    const role = (user.publicMetadata?.role as string) || "client";
    const ownClientId = user.publicMetadata?.clientId as string | undefined;

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
