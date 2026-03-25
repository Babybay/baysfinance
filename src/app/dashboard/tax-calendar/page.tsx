import { getDeadlines } from "@/app/actions/deadlines";
import { TaxCalendarView } from "./TaxCalendarView";
import { TaxDeadline } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth-helpers";

export default async function TaxCalendarPage() {
    const user = await getCurrentUser();
    const role = user?.role?.toLowerCase() || "client";
    const clientId = user?.clientId;

    const currentClientId = role === "client" ? clientId : undefined;

    const res = await getDeadlines(currentClientId ?? undefined);

    let initialDeadlines: TaxDeadline[] = [];
    if (res.success && res.data) {
        initialDeadlines = (res.data as any[]).map(d => ({
            ...d,
            tanggalBatas: new Date(d.tanggalBatas).toISOString().split("T")[0],
            status: d.status as TaxDeadline["status"],
            clientName: d.clientName || undefined,
        }));
    }

    return <TaxCalendarView initialDeadlines={initialDeadlines} />;
}
