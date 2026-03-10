import React from "react";
import { ReportsView } from "./ReportsView";
import { getClients } from "@/app/actions/clients";
import { Client } from "@/lib/data";

export default async function ReportsPage() {
    const res = await getClients();
    const clients = (res.success ? res.data : []) as unknown as Client[];

    return <ReportsView clients={clients} />;
}
