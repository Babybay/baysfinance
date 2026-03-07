"use client";

import React, { createContext, useContext } from "react";

export type UserRole = "admin" | "client";

interface RoleContextType {
    isLoaded: boolean;
    role: UserRole | null;
    clientId: string | undefined;
    isAdmin: boolean;
    isClient: boolean;
}

const RoleContext = createContext<RoleContextType>({
    isLoaded: false,
    role: null,
    clientId: undefined,
    isAdmin: false,
    isClient: false,
});

export function RoleProvider({ children, role, clientId }: { children: React.ReactNode; role: string; clientId?: string }) {
    return (
        <RoleContext.Provider value={{
            isLoaded: true,
            role: role as UserRole,
            clientId,
            isAdmin: role === "admin",
            isClient: role === "client",
        }}>
            {children}
        </RoleContext.Provider>
    );
}

export function useRoles() {
    return useContext(RoleContext);
}
