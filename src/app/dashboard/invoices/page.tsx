import { getInvoices } from "@/app/actions/invoices";
import { getClients } from "@/app/actions/clients";
import { InvoiceListView } from "./InvoiceListView";
import { Invoice, Client } from "@/lib/data";
import { currentUser } from "@clerk/nextjs/server";
import { JenisWP, ClientStatus } from "@prisma/client";

export default async function InvoicesPage() {
    const user = await currentUser();
    const role = (user?.publicMetadata?.role as string) || "client";
    const clientId = user?.publicMetadata?.clientId as string | undefined;

    const currentClientId = role === "client" ? clientId : undefined;

    const [invRes, clientsRes] = await Promise.all([
        getInvoices(currentClientId ?? undefined),
        getClients(),
    ]);

    let initialInvoices: Invoice[] = [];
    if (invRes.success && invRes.data) {
        initialInvoices = (invRes.data as any[]).map(i => ({
            ...i,
            tanggal: new Date(i.tanggal).toISOString().split("T")[0],
            jatuhTempo: new Date(i.jatuhTempo).toISOString().split("T")[0],
            status: i.status as Invoice["status"],
            items: i.items || [],
            catatan: i.catatan || "",
        }));
    }

    let clients: Client[] = [];
    if (clientsRes.success && clientsRes.data) {
        clients = (clientsRes.data as any[]).map(c => ({
            ...c,
            jenisWP: c.jenisWP as JenisWP,
            status: c.status as ClientStatus,
            createdAt: new Date(c.createdAt).toISOString().split("T")[0],
        }));
    }

    return <InvoiceListView initialInvoices={initialInvoices} clients={clients} />;
}
