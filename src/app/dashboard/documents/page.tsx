import { getDocuments } from "@/app/actions/documents";
import { getClients } from "@/app/actions/clients";
import { DocumentListView } from "./DocumentListView";
import { Document as DocType, Client } from "@/lib/data";
import { currentUser } from "@clerk/nextjs/server";
import { JenisWP, ClientStatus, DocumentKategori } from "@prisma/client";

export default async function DocumentsPage() {
    const user = await currentUser();
    const role = (user?.publicMetadata?.role as string) || "client";
    const clientId = user?.publicMetadata?.clientId as string | undefined;

    const currentClientId = role === "client" ? clientId : undefined;

    const [docsRes, clientsRes] = await Promise.all([
        getDocuments(currentClientId ?? undefined),
        getClients(),
    ]);

    let initialDocuments: DocType[] = [];
    if (docsRes.success && docsRes.data) {
        initialDocuments = (docsRes.data as any[]).map(d => ({
            ...d,
            tanggalUpload: new Date(d.tanggalUpload).toISOString().split("T")[0],
            kategori: d.kategori as DocumentKategori,
            catatan: d.catatan || "",
        }));
    }

    let clients: Client[] = [];
    if (clientsRes.success && clientsRes.data) {
        clients = (clientsRes.data as any[]).map(c => ({
            ...c,
            jenisWP: c.jenisWP as JenisWP,
            status: c.status as ClientStatus,
            createdAt: new Date(c.createdAt).toISOString().split("T")[0],
        }));
    }

    return <DocumentListView initialDocuments={initialDocuments} clients={clients} />;
}
