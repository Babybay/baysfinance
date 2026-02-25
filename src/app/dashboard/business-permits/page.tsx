"use client";

import React, { useEffect, useState } from "react";
import { useRoles } from "@/lib/hooks/useRoles";
import { BusinessPermitList } from "@/components/dashboard/BusinessPermitList";
import { BusinessPermitCase } from "@/lib/data";
import { getPermits } from "@/app/actions/business-permits";

export default function BusinessPermitsPage() {
    const { role, clientId, isLoaded: roleLoaded, isAdmin } = useRoles();
    const [permits, setPermits] = useState<BusinessPermitCase[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (!roleLoaded) return;
        loadData();
    }, [roleLoaded, role, clientId]);

    const loadData = async () => {
        setIsLoaded(false);
        const currentClientId = role === "client" ? clientId : undefined;
        const res = await getPermits(currentClientId ?? undefined);

        if (res.success && res.data) {
            const formatted = (res.data as any[]).map(p => ({
                ...p,
                status: p.status as BusinessPermitCase["status"],
                riskCategory: p.riskCategory as BusinessPermitCase["riskCategory"],
                createdAt: new Date(p.createdAt).toISOString().split("T")[0],
                updatedAt: new Date(p.updatedAt).toISOString().split("T")[0],
            }));
            setPermits(formatted);
        }
        setIsLoaded(true);
    };

    if (!roleLoaded || !isLoaded) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
            </div>
        );
    }

    return (
        <BusinessPermitList
            permits={permits}
            isAdmin={!!isAdmin}
        />
    );
}
