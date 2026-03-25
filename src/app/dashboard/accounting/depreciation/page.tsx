import React from "react";
import { DepreciationView } from "@/components/accounting/DepreciationView";
import { getClients } from "@/app/actions/clients";
import { Client } from "@/lib/data";

export default async function DepreciationPage() {
    const clientsRes = await getClients();
    const clients = (clientsRes.success ? clientsRes.data : []) as unknown as Client[];

    return <DepreciationView clients={clients} />;
}
