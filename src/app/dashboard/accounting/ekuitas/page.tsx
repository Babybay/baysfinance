import React from "react";
import { EkuitasView } from "@/components/accounting/EkuitasView";
import { getClients } from "@/app/actions/clients";
import { Client } from "@/lib/data";

export default async function EkuitasPage() {
    const clientsRes = await getClients();
    const clients = (clientsRes.success ? clientsRes.data : []) as unknown as Client[];

    return <EkuitasView clients={clients} />;
}
