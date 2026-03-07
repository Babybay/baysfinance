import { getDeadlines } from "@/app/actions/deadlines";
import { TaxCalendarView } from "./TaxCalendarView";
import { TaxDeadline } from "@/lib/data";
import { currentUser } from "@clerk/nextjs/server";

export default async function TaxCalendarPage() {
    const user = await currentUser();
    const role = (user?.publicMetadata?.role as string) || "client";
    const clientId = user?.publicMetadata?.clientId as string | undefined;

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
