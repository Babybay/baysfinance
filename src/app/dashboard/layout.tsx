import { DashboardShell } from "@/components/layout/DashboardShell";
import { RoleProvider } from "@/lib/hooks/useRoles";
import { ToastProvider } from "@/components/ui/Toast";
import { getCurrentUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/sign-in");
    }

    const role = user.role.toLowerCase(); // "admin" | "staff" | "client"
    const clientId = user.clientId;

    return (
        <RoleProvider role={role} clientId={clientId}>
            <ToastProvider>
                <DashboardShell>{children}</DashboardShell>
            </ToastProvider>
        </RoleProvider>
    );
}
