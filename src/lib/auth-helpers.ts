import { currentUser } from "@clerk/nextjs/server";

/**
 * Asserts that the currently authenticated Clerk user can access data
 * for the given clientId.
 *
 * Rules:
 *  - Admins and staff can access any client.
 *  - Client-role users can only access their own clientId
 *    (stored in Clerk publicMetadata.clientId).
 *
 * Throws "UNAUTHENTICATED" if not logged in.
 * Throws "FORBIDDEN" if a client-role user tries to access another tenant.
 */
export async function assertCanAccessClient(clientId: string): Promise<void> {
    const user = await currentUser();
    if (!user) throw new Error("UNAUTHENTICATED");

    const role = (user.publicMetadata?.role as string) || "client";
    if (role === "admin" || role === "staff") return;

    const ownClientId = user.publicMetadata?.clientId as string | undefined;
    if (!ownClientId || ownClientId !== clientId) {
        throw new Error("FORBIDDEN");
    }
}

/**
 * Returns true if the current user is an admin or staff.
 * Returns false (not throwing) when unauthenticated.
 */
export async function isAdminOrStaff(): Promise<boolean> {
    const user = await currentUser();
    if (!user) return false;
    const role = (user.publicMetadata?.role as string) || "client";
    return role === "admin" || role === "staff";
}

/** Re-usable handler: converts auth errors to the standard action return shape. */
export function handleAuthError(error: unknown): { success: false; error: string } {
    if (error instanceof Error) {
        if (error.message === "UNAUTHENTICATED") {
            return { success: false, error: "Sesi tidak valid. Silakan login kembali." };
        }
        if (error.message === "FORBIDDEN") {
            return { success: false, error: "Akses ditolak." };
        }
    }
    return { success: false, error: "Terjadi kesalahan. Silakan coba lagi." };
}
