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
    namaBank?: string | null;
    nomorRekening?: string | null;
    atasNama?: string | null;
    penandaTangan?: string | null;
    jabatanPenandaTangan?: string | null;
    items: PrintInvoiceItem[];
    client: PrintInvoiceClient | null;
}

interface InvoicePrintViewProps {
    invoice: PrintInvoiceData;
}

export function InvoicePrintView({ invoice }: InvoicePrintViewProps) {
    const formatDate = (date: string | Date) =>
        new Date(date).toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });

    const formatNumber = (n: number) =>
        new Intl.NumberFormat("id-ID").format(n);

    return (
        <>
            <style jsx global>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 10mm 12mm;
                    }
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
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
                        padding: 0 !important;
                        margin: 0 !important;
                        box-shadow: none !important;
                        border-radius: 0 !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
            `}</style>

            <div className="min-h-screen bg-gray-100 py-6 px-4">
                {/* Action Buttons */}
                <div className="no-print max-w-[210mm] mx-auto mb-4 flex gap-3">
                    <button
                        onClick={() => window.print()}
                        className="px-6 py-2.5 bg-accent text-white font-medium rounded-lg hover:bg-accent-hover transition-colors shadow-sm"
                    >
                        Cetak Invoice
                    </button>
                    <button
                        onClick={() => window.close()}
                        className="px-6 py-2.5 bg-white text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm border border-gray-300"
                    >
                        Tutup
                    </button>
                </div>

                {/* Invoice Content — A4 size */}
                <div
                    id="invoice-print-area"
                    className="max-w-[210mm] mx-auto bg-white shadow-lg rounded-lg"
                    style={{ minHeight: "297mm" }}
                >
                    <div className="px-10 py-8 flex flex-col" style={{ minHeight: "277mm" }}>

                        {/* ═══ HEADER ═══ */}
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                                    Bay&apos;sConsult
                                </h1>
                                <p className="text-[11px] text-blue-600 font-semibold tracking-wide uppercase mt-0.5">
                                    Tax Consultant &amp; Business Advisory
                                </p>
                            </div>
                            <div className="text-right">
                                <h2 className="text-3xl font-extrabold text-gray-800 tracking-tight">
                                    INVOICE
                                </h2>
                                <table className="ml-auto mt-1 text-[12px] text-gray-600">
                                    <tbody>
                                        <tr>
                                            <td className="pr-2 text-right text-gray-500">Reff</td>
                                            <td className="font-semibold text-gray-800">: {invoice.nomorInvoice}</td>
                                        </tr>
                                        <tr>
                                            <td className="pr-2 text-right text-gray-500">Date</td>
                                            <td>: {formatDate(invoice.tanggal)}</td>
                                        </tr>
                                        <tr>
                                            <td className="pr-2 text-right text-gray-500">Due Date</td>
                                            <td>: {formatDate(invoice.jatuhTempo)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* ═══ BILL FROM / BILL TO ═══ */}
                        <div className="grid grid-cols-2 gap-4 mb-5">
                            {/* Bill From */}
                            <div>
                                <p className="text-[11px] text-gray-500 mb-1">Bill from :</p>
                                <div className="border border-gray-300 rounded p-3 text-[12px] text-gray-700 leading-relaxed">
                                    <p className="font-bold text-gray-900 text-[13px]">BAY&apos;SCONSULT</p>
                                    <p>Jl. Sudirman No. 123, Jakarta Selatan</p>
                                    <p>Telp: (021) 555-0123</p>
                                    <p>Email: info@baysconsult.id</p>
                                    <p>NPWP: 00.000.000.0-000.000</p>
                                </div>
                            </div>
                            {/* Bill To */}
                            <div>
                                <p className="text-[11px] text-gray-500 mb-1">Bill to :</p>
                                <div className="border border-gray-300 rounded p-3 text-[12px] text-gray-700 leading-relaxed">
                                    <p className="font-bold text-gray-900 text-[13px]">
                                        {invoice.client?.nama || invoice.clientName}
                                    </p>
                                    {invoice.client?.alamat && <p>{invoice.client.alamat}</p>}
                                    {invoice.client?.npwp && <p>NPWP: {invoice.client.npwp}</p>}
                                    {invoice.client?.telepon && <p>Telp: {invoice.client.telepon}</p>}
                                    {invoice.client?.email && <p>Email: {invoice.client.email}</p>}
                                </div>
                            </div>
                        </div>

                        {/* ═══ ITEMS TABLE ═══ */}
                        <table className="w-full text-[12px] mb-0 border-collapse">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="border border-gray-300 px-2 py-2 text-center font-semibold text-gray-700 w-[40px]">No.</th>
                                    <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Description</th>
                                    <th className="border border-gray-300 px-2 py-2 text-center font-semibold text-gray-700 w-[50px]">Qty</th>
                                    <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 w-[110px]">Rate</th>
                                    <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700 w-[110px]">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoice.items.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="border border-gray-300 px-2 py-2 text-center text-gray-600">{idx + 1}</td>
                                        <td className="border border-gray-300 px-3 py-2 text-gray-900">{item.deskripsi}</td>
                                        <td className="border border-gray-300 px-2 py-2 text-center text-gray-600">{item.qty}</td>
                                        <td className="border border-gray-300 px-3 py-2 text-right text-gray-700">{formatNumber(item.harga)}</td>
                                        <td className="border border-gray-300 px-3 py-2 text-right font-medium text-gray-900">{formatNumber(item.jumlah)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* ═══ NOTES + PAYMENT (left) | TOTALS (right) ═══ */}
                        <div className="grid grid-cols-2 gap-4 mt-0">
                            {/* Left: Notes + Payment Details */}
                            <div className="text-[12px] text-gray-700 pt-3">
                                {invoice.catatan && (
                                    <div className="mb-3">
                                        <p className="font-bold text-gray-800">Notes :</p>
                                        <p className="text-gray-600 mt-0.5">{invoice.catatan}</p>
                                    </div>
                                )}
                                <div>
                                    <p className="font-bold text-gray-800">Payment Details</p>
                                    <ul className="list-disc list-inside mt-1 space-y-0.5 text-gray-600">
                                        <li>Bank Name : {invoice.namaBank || "BCA"}</li>
                                        <li>Account Number : {invoice.nomorRekening || "-"}</li>
                                        <li>Account Name : {invoice.atasNama || "Bay'sConsult"}</li>
                                    </ul>
                                    <p className="mt-2 text-gray-500 text-[11px]">
                                        Please Send Proof of Payment to our email or Whatsapp.
                                    </p>
                                    <p className="font-bold text-gray-800 mt-1 text-[11px]">
                                        Thankyou for entrusting your business to us !
                                    </p>
                                </div>
                            </div>

                            {/* Right: Totals */}
                            <div className="pt-0">
                                <table className="w-full text-[12px] border-collapse">
                                    <tbody>
                                        <tr>
                                            <td className="border border-gray-300 px-3 py-2 text-gray-600 bg-gray-50">Subtotal</td>
                                            <td className="border border-gray-300 px-3 py-2 text-right font-medium text-gray-900 bg-gray-50 w-[130px]">
                                                Rp {formatNumber(invoice.subtotal)}
                                            </td>
                                        </tr>
                                        {invoice.ppn > 0 && (
                                            <tr>
                                                <td className="border border-gray-300 px-3 py-2 text-gray-600 bg-gray-50">PPN 11%</td>
                                                <td className="border border-gray-300 px-3 py-2 text-right font-medium text-gray-900 bg-gray-50">
                                                    Rp {formatNumber(invoice.ppn)}
                                                </td>
                                            </tr>
                                        )}
                                        <tr>
                                            <td className="border border-gray-300 px-3 py-2 font-bold text-gray-800 bg-gray-50">Grand Total</td>
                                            <td className="border border-gray-300 px-3 py-2 text-right font-bold text-gray-900 bg-gray-50">
                                                Rp {formatNumber(invoice.total)}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="border border-gray-300 px-3 py-2 font-bold text-gray-800 bg-gray-50">Balance Due</td>
                                            <td className="border border-gray-300 px-3 py-2 text-right font-bold text-gray-900 bg-gray-50">
                                                Rp {formatNumber(invoice.total)}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* ═══ SPACER — pushes signature to bottom ═══ */}
                        <div className="flex-1" />

                        {/* ═══ SIGNATURE AREA ═══ */}
                        <div className="flex justify-end mt-6">
                            <div className="text-center w-[220px]">
                                <p className="text-[12px] text-gray-700">Best Regards,</p>
                                {/* Signature space */}
                                <div className="h-[70px]" />
                                <div className="border-b border-gray-400 mx-2" />
                                <p className="font-bold text-[12px] text-gray-900 mt-1">
                                    {invoice.penandaTangan || "________________"}
                                </p>
                                <p className="text-[11px] text-gray-600">
                                    {invoice.jabatanPenandaTangan || "Managing Partner"}
                                </p>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </>
    );
}
