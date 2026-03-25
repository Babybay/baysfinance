import { auth } from "@/lib/auth";

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    role: string;
    clientId?: string;
    organisationId?: string;
}

/**
 * Returns the currently authenticated user from the session.
 * Replaces `currentUser()` from Clerk — all pages/actions should use this.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
    const session = await auth();
    if (!session?.user) return null;
    return session.user as AuthUser;
}

/**
 * Asserts that the currently authenticated user can access data
 * for the given clientId.
 *
 * Rules:
 *  - Admins and staff can access any client.
 *  - Client-role users can only access their own clientId.
 *
 * Throws "UNAUTHENTICATED" if not logged in.
 * Throws "FORBIDDEN" if a client-role user tries to access another tenant.
 */
export async function assertCanAccessClient(clientId: string): Promise<void> {
    const user = await getCurrentUser();
    if (!user) throw new Error("UNAUTHENTICATED");

    const role = user.role;
    if (role === "Admin" || role === "Staff") return;

    if (!user.clientId || user.clientId !== clientId) {
        throw new Error("FORBIDDEN");
    }
}

/**
 * Returns true if the current user is an admin or staff.
 * Returns false (not throwing) when unauthenticated.
 */
export async function isAdminOrStaff(): Promise<boolean> {
    const user = await getCurrentUser();
    if (!user) return false;
    return user.role === "Admin" || user.role === "Staff";
}

/**
 * Returns the clientId of the currently authenticated client-role user,
 * or null if the user is admin/staff or unauthenticated.
 */
export async function getOwnClientId(): Promise<string | null> {
    const user = await getCurrentUser();
    if (!user) return null;
    return user.clientId || null;
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
