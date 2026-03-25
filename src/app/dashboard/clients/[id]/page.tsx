import { getClientDetail } from "@/app/actions/clients";
import { ClientDetailView } from "./ClientDetailView";
import { getCurrentUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser();
    const role = user?.role?.toLowerCase() || "client";
    const isAdmin = role === "admin";

    if (!isAdmin) {
        redirect("/dashboard");
    }

    const { id } = await params;
    const res = await getClientDetail(id);

    if (!res.success || !res.data) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-card rounded-[16px] border border-border">
                <ShieldAlert className="h-12 w-12 text-error mb-4" />
                <h2 className="font-serif text-xl text-foreground">Klien Tidak Ditemukan</h2>
                <p className="text-muted-foreground mt-2 text-center max-w-md">{res.error}</p>
            </div>
        );
    }

    return <ClientDetailView client={res.data} />;
}
