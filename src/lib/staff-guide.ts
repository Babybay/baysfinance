export const DEFAULT_STAFF_PORTAL_URL = "https://thebaysworld.j.frappe.cloud/app";

export function getStaffPortalUrl(configuredUrl = process.env.NEXT_PUBLIC_STAFF_PORTAL_URL): string {
    return configuredUrl?.trim() || DEFAULT_STAFF_PORTAL_URL;
}

export function getStaffDeskUrl(route: string, configuredUrl = process.env.NEXT_PUBLIC_STAFF_PORTAL_URL): string {
    const normalizedRoute = route.replace(/^\/+/, "");

    try {
        return new URL(`/app/${normalizedRoute}`, new URL(getStaffPortalUrl(configuredUrl)).origin).toString();
    } catch {
        return new URL(`/app/${normalizedRoute}`, new URL(DEFAULT_STAFF_PORTAL_URL).origin).toString();
    }
}
