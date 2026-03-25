import React from "react";
import { FiscalCloseView } from "@/components/accounting/FiscalCloseView";
import { getClients } from "@/app/actions/clients";
import { Client } from "@/lib/data";

export default async function FiscalClosePage() {
    const clientsRes = await getClients();
    const clients = (clientsRes.success ? clientsRes.data : []) as unknown as Client[];

    return <FiscalCloseView clients={clients} />;
}
