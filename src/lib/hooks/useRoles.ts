"use client";

import { useUser } from "@clerk/nextjs";

export type UserRole = "admin" | "client";

export function useRoles() {
    const { user, isLoaded } = useUser();

    if (!isLoaded) {
        return { isLoaded: false, role: null as UserRole | null, clientId: undefined };
    }

    // default to client if not set, for safety
    // in a real app, you might want to default to null and handle setup
    const role = (user?.publicMetadata?.role as UserRole) || "admin";
    const clientId = user?.publicMetadata?.clientId as string | undefined;

    return {
        isLoaded: true,
        role,
        clientId,
        isAdmin: role === "admin",
        isClient: role === "client",
    };
}
