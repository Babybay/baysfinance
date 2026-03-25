import { getRecurringInvoices } from "@/app/actions/recurring-invoices";
import { getClients } from "@/app/actions/clients";
import { RecurringInvoiceView } from "./RecurringInvoiceView";
import { getCurrentUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";

export default async function RecurringInvoicesPage() {
    const user = await getCurrentUser();
    const role = user?.role?.toLowerCase() || "client";

    if (role !== "admin") {
        redirect("/dashboard/invoices");
    }

    const [recurringRes, clientsRes] = await Promise.all([
        getRecurringInvoices(),
        getClients(),
    ]);

    const recurring = recurringRes.success && recurringRes.data
        ? (recurringRes.data as any[]).map(r => ({
            ...r,
            nextRunDate: new Date(r.nextRunDate).toISOString(),
            createdAt: new Date(r.createdAt).toISOString(),
            updatedAt: new Date(r.updatedAt).toISOString(),
            client: r.client ? { id: r.client.id, nama: r.client.nama } : null,
            items: r.items || [],
        }))
        : [];

    const clients = clientsRes.success && clientsRes.data
        ? (clientsRes.data as any[]).map(c => ({ id: c.id, nama: c.nama }))
        : [];

    return <RecurringInvoiceView initialRecurring={recurring} clients={clients} />;
}
