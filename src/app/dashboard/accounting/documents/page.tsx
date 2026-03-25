import React from "react";
import { AccountingDocumentsView } from "./AccountingDocumentsView";
import { getAccountingDocuments } from "@/app/actions/accounting-documents";
import { getClients } from "@/app/actions/clients";
import { AccountingDocument, Client } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";

export default async function AccountingDocumentsPage() {
    const user = await getCurrentUser();
    if (!user) redirect("/sign-in");

    const role = user.role.toLowerCase();
    const ownClientId = user.clientId;
    const isClientRole = role === "client";

    const clientsRes = await getClients();
    const clients = (clientsRes.success ? clientsRes.data : []) as unknown as Client[];

    // For client-role users, auto-scope to own client
    const resolvedClientId = isClientRole ? (ownClientId ?? "") : "";

    let initialDocuments: AccountingDocument[] = [];
    if (resolvedClientId) {
        const docsRes = await getAccountingDocuments(resolvedClientId);
        initialDocuments = (docsRes.success ? docsRes.data : []) as unknown as AccountingDocument[];
    }

    return (
        <AccountingDocumentsView
            initialDocuments={initialDocuments}
            clients={clients}
            defaultClientId={resolvedClientId}
            isClientRole={isClientRole}
        />
    );
}
