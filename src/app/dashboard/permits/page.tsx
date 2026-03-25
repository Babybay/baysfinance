import { PermitList } from "@/components/dashboard/PermitList";
import { PermitCase } from "@/lib/data";
import { getPermits, getPermitTypes } from "@/app/actions/permits";
import { getCurrentUser } from "@/lib/auth-helpers";

export default async function PermitsPage() {
    const user = await getCurrentUser();
    const role = user?.role?.toLowerCase() || "client";
    const clientId = user?.clientId;

    const currentClientId = role === "client" ? clientId : undefined;
    const [permitsRes, typesRes] = await Promise.all([
        getPermits(currentClientId ?? undefined),
        getPermitTypes(),
    ]);

    let permits: PermitCase[] = [];
    if (permitsRes.success && permitsRes.data) {
        permits = (permitsRes.data as any[]).map(p => ({
            ...p,
            status: p.status as PermitCase["status"],
            riskCategory: p.riskCategory as PermitCase["riskCategory"],
            createdAt: new Date(p.createdAt).toISOString().split("T")[0],
            updatedAt: new Date(p.updatedAt).toISOString().split("T")[0],
        }));
    }

    let permitTypes: any[] = [];
    if (typesRes.success && typesRes.data) {
        permitTypes = typesRes.data;
    }

    return (
        <PermitList
            permits={permits}
            permitTypes={permitTypes}
            isAdmin={role !== "client"}
        />
    );
}
