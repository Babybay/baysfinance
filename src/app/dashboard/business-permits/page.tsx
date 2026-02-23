"use client";

import React, { useEffect, useState } from "react";
import { useRoles } from "@/lib/hooks/useRoles";
import { BusinessPermitList } from "@/components/dashboard/BusinessPermitList";
import {
    samplePermitCases,
    BusinessPermitCase,
    getFilteredPermits
} from "@/lib/data";

export default function BusinessPermitsPage() {
    const { role, clientId, isLoaded: roleLoaded, isAdmin } = useRoles();
    const [permits, setPermits] = useState<BusinessPermitCase[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (!roleLoaded) return;

        const storedPermits = localStorage.getItem("pajak_permits");
        const allPermits = storedPermits ? JSON.parse(storedPermits) : samplePermitCases;

        const currentRole = (role as "admin" | "client") || "admin";
        setPermits(getFilteredPermits(allPermits, currentRole, clientId));
        setIsLoaded(true);
    }, [roleLoaded, role, clientId]);

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
            isAdmin={isAdmin}
        />
    );
}
