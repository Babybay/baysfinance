import { DashboardShell } from "@/components/layout/DashboardShell";
import { RoleProvider } from "@/lib/hooks/useRoles";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await currentUser();

    if (!user) {
        redirect("/sign-in");
    }

    const role = (user.publicMetadata?.role as string) || "client";
    const clientId = user.publicMetadata?.clientId as string | undefined;

    return (
        <RoleProvider role={role} clientId={clientId}>
            <DashboardShell>{children}</DashboardShell>
        </RoleProvider>
    );
}
