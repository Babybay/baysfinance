"use client";

import React, { createContext, useContext } from "react";

export type UserRole = "admin" | "staff" | "client";

interface RoleContextType {
    isLoaded: boolean;
    role: UserRole | null;
    clientId: string | undefined;
    isAdmin: boolean;
    isStaff: boolean;
    isAgency: boolean;
    isClient: boolean;
}

const RoleContext = createContext<RoleContextType>({
    isLoaded: false,
    role: null,
    clientId: undefined,
    isAdmin: false,
    isStaff: false,
    isAgency: false,
    isClient: false,
});

export function RoleProvider({ children, role, clientId }: { children: React.ReactNode; role: string; clientId?: string }) {
    const normalizedRole = role.toLowerCase() as UserRole;
    const isAgency = normalizedRole === "admin" || normalizedRole === "staff";

    return (
        <RoleContext.Provider value={{
            isLoaded: true,
            role: normalizedRole,
            clientId,
            isAdmin: isAgency,
            isStaff: normalizedRole === "staff",
            isAgency,
            isClient: normalizedRole === "client",
        }}>
            {children}
        </RoleContext.Provider>
    );
}

export function useRoles() {
    return useContext(RoleContext);
}
