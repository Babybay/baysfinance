"use client";

import { useUser } from "@clerk/nextjs";

export type UserRole = "admin" | "client";

export function useRoles() {
    const { user, isLoaded } = useUser();

    if (!isLoaded) {
        return { isLoaded: false, role: null as UserRole | null, clientId: undefined };
    }

    // Default to "client" if no role is set — new users are clients.
    // Only users explicitly promoted via User Management become admins.
    const role = (user?.publicMetadata?.role as UserRole) || "client";
    const clientId = user?.publicMetadata?.clientId as string | undefined;

    return {
        isLoaded: true,
        role,
        clientId,
        isAdmin: role === "admin",
        isClient: role === "client",
    };
}
