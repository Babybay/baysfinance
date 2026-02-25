"use client";

import React, { useEffect, useState } from "react";
import { useRoles } from "@/lib/hooks/useRoles";
import { PermitList } from "@/components/dashboard/PermitList";
import { PermitCase } from "@/lib/data";
import { getPermits, getPermitTypes } from "@/app/actions/permits";

export default function PermitsPage() {
    const { role, clientId, isLoaded: roleLoaded, isAdmin } = useRoles();
    const [permits, setPermits] = useState<PermitCase[]>([]);
    const [permitTypes, setPermitTypes] = useState<any[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (!roleLoaded) return;
        loadData();
    }, [roleLoaded, role, clientId]);

    const loadData = async () => {
        setIsLoaded(false);
        const currentClientId = role === "client" ? clientId : undefined;
        const [permitsRes, typesRes] = await Promise.all([
            getPermits(currentClientId ?? undefined),
            getPermitTypes(),
        ]);

        if (permitsRes.success && permitsRes.data) {
            const formatted = (permitsRes.data as any[]).map(p => ({
                ...p,
                status: p.status as PermitCase["status"],
                riskCategory: p.riskCategory as PermitCase["riskCategory"],
                createdAt: new Date(p.createdAt).toISOString().split("T")[0],
                updatedAt: new Date(p.updatedAt).toISOString().split("T")[0],
            }));
            setPermits(formatted);
        }
        if (typesRes.success) setPermitTypes(typesRes.data);
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
        <PermitList
            permits={permits}
            permitTypes={permitTypes}
            isAdmin={!!isAdmin}
        />
    );
}
