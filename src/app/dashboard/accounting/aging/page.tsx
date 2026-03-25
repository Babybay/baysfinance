import React from "react";
import { AgingReportView } from "@/components/accounting/AgingReportView";
import { getClients } from "@/app/actions/clients";
import { Client } from "@/lib/data";

export default async function AgingPage() {
    const clientsRes = await getClients();
    const clients = (clientsRes.success ? clientsRes.data : []) as unknown as Client[];
    return <AgingReportView clients={clients} />;
}
