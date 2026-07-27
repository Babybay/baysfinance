export function isAdminOrStaffRole(role: string | undefined): boolean {
    const normalizedRole = role?.toLowerCase();
    return normalizedRole === "admin" || normalizedRole === "staff";
}
