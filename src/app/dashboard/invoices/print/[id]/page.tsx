import { getInvoiceById } from "@/app/actions/invoices";
import { InvoicePrintView } from "../../InvoicePrintView";
import { notFound } from "next/navigation";

interface PrintPageProps {
    params: Promise<{ id: string }>;
}

export default async function InvoicePrintPage({ params }: PrintPageProps) {
    const { id } = await params;
    const res = await getInvoiceById(id);

    if (!res.success || !res.data) {
        notFound();
    }

    // Serialize dates to strings for the client component
    const invoice = {
        ...res.data,
        tanggal: res.data.tanggal.toISOString(),
        jatuhTempo: res.data.jatuhTempo.toISOString(),
    };

    return <InvoicePrintView invoice={invoice} />;
}
