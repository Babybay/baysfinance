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

    // Serialize dates to strings and convert Decimal fields to number for the client component
    const invoice = {
        ...res.data,
        tanggal: res.data.tanggal.toISOString(),
        jatuhTempo: res.data.jatuhTempo.toISOString(),
        subtotal: Number(res.data.subtotal),
        ppn: Number(res.data.ppn),
        total: Number(res.data.total),
        items: res.data.items.map(item => ({
            ...item,
            harga: Number(item.harga),
            jumlah: Number(item.jumlah),
        })),
    };

    return <InvoicePrintView invoice={invoice} />;
}
