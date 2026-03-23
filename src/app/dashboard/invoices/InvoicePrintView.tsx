"use client";

import React from "react";
import { formatIDR } from "@/lib/data";

interface PrintInvoiceItem {
    deskripsi: string;
    qty: number;
    harga: number;
    jumlah: number;
}

interface PrintInvoiceClient {
    nama: string;
    npwp: string;
    alamat: string;
    email: string;
    telepon: string;
}

interface PrintInvoiceData {
    nomorInvoice: string;
    tanggal: string | Date;
    jatuhTempo: string | Date;
    clientName: string;
    subtotal: number;
    ppn: number;
    total: number;
    status: string;
    catatan: string | null;
    items: PrintInvoiceItem[];
    client: PrintInvoiceClient | null;
}

interface InvoicePrintViewProps {
    invoice: PrintInvoiceData;
}

export function InvoicePrintView({ invoice }: InvoicePrintViewProps) {
    const formatDate = (date: string | Date) =>
        new Date(date).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });

    return (
        <>
            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #invoice-print-area,
                    #invoice-print-area * {
                        visibility: visible;
                    }
                    #invoice-print-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
            `}</style>

            <div className="min-h-screen bg-background py-8 px-4">
                {/* Print Button */}
                <div className="no-print max-w-3xl mx-auto mb-4 flex gap-3">
                    <button
                        onClick={() => window.print()}
                        className="px-6 py-2.5 bg-accent text-white font-medium rounded-lg hover:bg-accent-hover transition-colors shadow-sm"
                    >
                        Cetak Invoice
                    </button>
                    <button
                        onClick={() => window.close()}
                        className="px-6 py-2.5 bg-surface text-foreground font-medium rounded-lg hover:bg-border transition-colors shadow-sm"
                    >
                        Tutup
                    </button>
                </div>

                {/* Invoice Content */}
                <div
                    id="invoice-print-area"
                    className="max-w-3xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden"
                >
                    <div className="p-8">
                        {/* Header */}
                        <div className="flex justify-between items-start border-b-2 border-gray-800 pb-6 mb-6">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">
                                    Bay&apos;sConsult
                                </h1>
                                <p className="text-sm text-gray-600 mt-1">
                                    Konsultan Pajak Terdaftar
                                </p>
                                <p className="text-sm text-gray-500 mt-2">
                                    Jl. Sudirman No. 123, Jakarta Selatan
                                    <br />
                                    DKI Jakarta 12190
                                    <br />
                                    Telp: (021) 555-0123
                                    <br />
                                    Email: info@baysconsult.id
                                </p>
                            </div>
                            <div className="text-right">
                                <h2 className="text-2xl font-bold text-gray-400 uppercase tracking-wider">
                                    Invoice
                                </h2>
                                <p className="text-sm font-mono font-semibold text-gray-800 mt-2">
                                    {invoice.nomorInvoice}
                                </p>
                                <div className="mt-3 text-sm text-gray-600 space-y-1">
                                    <p>
                                        <span className="text-gray-500">Tanggal:</span>{" "}
                                        {formatDate(invoice.tanggal)}
                                    </p>
                                    <p>
                                        <span className="text-gray-500">Jatuh Tempo:</span>{" "}
                                        {formatDate(invoice.jatuhTempo)}
                                    </p>
                                </div>
                                <div className="mt-3">
                                    <span
                                        className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${
                                            invoice.status === "Lunas"
                                                ? "bg-green-100 text-green-800"
                                                : invoice.status === "JatuhTempo"
                                                ? "bg-red-100 text-red-800"
                                                : invoice.status === "Terkirim"
                                                ? "bg-blue-100 text-blue-800"
                                                : "bg-gray-100 text-gray-800"
                                        }`}
                                    >
                                        {invoice.status === "JatuhTempo"
                                            ? "Jatuh Tempo"
                                            : invoice.status}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Client Info */}
                        <div className="mb-8">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                Ditagihkan Kepada
                            </p>
                            <div className="bg-gray-50 rounded-lg p-4">
                                <p className="font-semibold text-gray-900 text-lg">
                                    {invoice.client?.nama || invoice.clientName}
                                </p>
                                {invoice.client?.npwp && (
                                    <p className="text-sm text-gray-600 mt-1">
                                        NPWP: {invoice.client.npwp}
                                    </p>
                                )}
                                {invoice.client?.alamat && (
                                    <p className="text-sm text-gray-600 mt-1">
                                        {invoice.client.alamat}
                                    </p>
                                )}
                                {invoice.client?.email && (
                                    <p className="text-sm text-gray-600 mt-1">
                                        {invoice.client.email}
                                        {invoice.client.telepon &&
                                            ` | ${invoice.client.telepon}`}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="mb-8">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b-2 border-gray-300">
                                        <th className="text-left py-3 px-2 font-semibold text-gray-700 text-xs uppercase tracking-wider">
                                            No.
                                        </th>
                                        <th className="text-left py-3 px-2 font-semibold text-gray-700 text-xs uppercase tracking-wider">
                                            Deskripsi
                                        </th>
                                        <th className="text-center py-3 px-2 font-semibold text-gray-700 text-xs uppercase tracking-wider">
                                            Qty
                                        </th>
                                        <th className="text-right py-3 px-2 font-semibold text-gray-700 text-xs uppercase tracking-wider">
                                            Harga Satuan
                                        </th>
                                        <th className="text-right py-3 px-2 font-semibold text-gray-700 text-xs uppercase tracking-wider">
                                            Jumlah
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {invoice.items.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="py-3 px-2 text-gray-600">
                                                {idx + 1}
                                            </td>
                                            <td className="py-3 px-2 text-gray-900">
                                                {item.deskripsi}
                                            </td>
                                            <td className="py-3 px-2 text-center text-gray-600">
                                                {item.qty}
                                            </td>
                                            <td className="py-3 px-2 text-right text-gray-600">
                                                {formatIDR(item.harga)}
                                            </td>
                                            <td className="py-3 px-2 text-right font-medium text-gray-900">
                                                {formatIDR(item.jumlah)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Totals */}
                        <div className="flex justify-end mb-8">
                            <div className="w-72">
                                <div className="flex justify-between py-2 text-sm text-gray-600">
                                    <span>Subtotal</span>
                                    <span className="font-medium text-gray-900">
                                        {formatIDR(invoice.subtotal)}
                                    </span>
                                </div>
                                <div className="flex justify-between py-2 text-sm text-gray-600 border-b border-gray-200">
                                    <span>PPN 11%</span>
                                    <span className="font-medium text-gray-900">
                                        {formatIDR(invoice.ppn)}
                                    </span>
                                </div>
                                <div className="flex justify-between py-3 text-lg font-bold text-gray-900">
                                    <span>Total</span>
                                    <span>{formatIDR(invoice.total)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        {invoice.catatan && (
                            <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wider mb-1">
                                    Catatan
                                </p>
                                <p className="text-sm text-yellow-800">
                                    {invoice.catatan}
                                </p>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="border-t-2 border-gray-200 pt-6">
                            <div className="grid grid-cols-2 gap-8 text-sm text-gray-600">
                                <div>
                                    <p className="font-semibold text-gray-700 mb-2">
                                        Informasi Pembayaran
                                    </p>
                                    <p>Bank BCA</p>
                                    <p>No. Rekening: 123-456-7890</p>
                                    <p>a.n. Bay&apos;sConsult</p>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-700 mb-2">
                                        Syarat & Ketentuan
                                    </p>
                                    <p>
                                        Pembayaran dilakukan paling lambat pada tanggal
                                        jatuh tempo. Keterlambatan pembayaran akan
                                        dikenakan denda 2% per bulan.
                                    </p>
                                </div>
                            </div>
                            <p className="text-center text-xs text-gray-400 mt-8">
                                Terima kasih atas kepercayaan Anda menggunakan jasa
                                Bay&apos;sConsult
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
