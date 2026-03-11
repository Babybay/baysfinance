import React from "react";
import { NeracaView } from "@/components/accounting/NeracaView";
import { getClients } from "@/app/actions/clients";
import { Client } from "@/lib/data";

export default async function NeracaPage() {
    const clientsRes = await getClients();
    const clients = (clientsRes.success ? clientsRes.data : []) as unknown as Client[];

    return <NeracaView clients={clients} />;
}
