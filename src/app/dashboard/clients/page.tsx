import { getClients } from "@/app/actions/clients";
import { ClientListView } from "./ClientListView";
import { Client } from "@prisma/client";
import { currentUser } from "@clerk/nextjs/server";
import { ShieldAlert } from "lucide-react";

export default async function ClientsPage() {
    const user = await currentUser();
    const role = (user?.publicMetadata?.role as string) || "client";
    const isAdmin = role === "admin";

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-card rounded-[16px] border border-border">
                <ShieldAlert className="h-12 w-12 text-error mb-4" />
                <h2 className="font-serif text-xl text-foreground">Akses Dibatasi</h2>
                <p className="text-muted-foreground mt-2 text-center max-w-md">Halaman ini hanya dapat diakses oleh Admin (Advisor).</p>
            </div>
        );
    }

    const res = await getClients();
    const initialClients = res.success ? (res.data as Client[]) : [];

    return <ClientListView initialClients={initialClients} />;
}
