import React from "react";
import { NeracaLajurView } from "@/components/accounting/NeracaLajurView";
import { getClients } from "@/app/actions/clients";
import { Client } from "@/lib/data";

export default async function NeracaLajurPage() {
    const clientsRes = await getClients();
    const clients = (clientsRes.success ? clientsRes.data : []) as unknown as Client[];

    return <NeracaLajurView clients={clients} />;
}
