"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatIDR } from "@/lib/data";
import { InvoiceStatus, TaxDeadlineStatus, PermitCaseStatus } from "@prisma/client";
import {
    ArrowLeft,
    Mail,
    Phone,
    MapPin,
    Receipt,
    Clock,
    FileText,
    Briefcase,
    DollarSign,
    AlertCircle,
    CheckCircle,
    TrendingUp,
} from "lucide-react";

type ClientWithRelations = {
    id: string;
    nama: string;
    npwp: string;
    jenisWP: string;
    email: string;
    telepon: string;
    alamat: string;
    status: string;
    createdAt: Date;
    invoices: {
        id: string;
        nomorInvoice: string;
        tanggal: Date;
        jatuhTempo: Date;
        total: number;
        status: InvoiceStatus;
        catatan: string | null;
        items: { id: string; deskripsi: string; qty: number; harga: number; jumlah: number }[];
    }[];
    deadlines: {
        id: string;
        jenisPajak: string;
        deskripsi: string;
        tanggalBatas: Date;
        masaPajak: string;
        status: TaxDeadlineStatus;
    }[];
    documents: {
        id: string;
        nama: string;
        kategori: string;
        ukuran: number;
        tanggalUpload: Date;
        catatan: string | null;
    }[];
    permits: {
        id: string;
        caseId: string;
        status: PermitCaseStatus;
        feeAmount: number;
        notes: string | null;
        createdAt: Date;
        permitType: { id: string; name: string; slug: string } | null;
    }[];
};

type Tab = "invoices" | "deadlines" | "documents" | "permits";

const TAB_CONFIG: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "invoices", label: "Faktur", icon: <Receipt className="h-4 w-4" /> },
    { key: "deadlines", label: "Batas Waktu Pajak", icon: <Clock className="h-4 w-4" /> },
    { key: "documents", label: "Dokumen", icon: <FileText className="h-4 w-4" /> },
    { key: "permits", label: "Izin Usaha", icon: <Briefcase className="h-4 w-4" /> },
];

function invoiceStatusVariant(status: InvoiceStatus): "success" | "warning" | "danger" | "info" | "default" {
    switch (status) {
        case "Lunas": return "success";
        case "Terkirim": return "info";
        case "JatuhTempo": return "danger";
        case "Draft": return "default";
        default: return "default";
    }
}

function invoiceStatusLabel(status: InvoiceStatus): string {
    switch (status) {
        case "Lunas": return "Lunas";
        case "Terkirim": return "Terkirim";
        case "JatuhTempo": return "Jatuh Tempo";
        case "Draft": return "Draft";
        default: return status;
    }
}

function deadlineStatusVariant(status: TaxDeadlineStatus): "success" | "warning" | "danger" | "default" {
    switch (status) {
        case "SudahLapor": return "success";
        case "BelumLapor": return "warning";
        case "Terlambat": return "danger";
        default: return "default";
    }
}

function deadlineStatusLabel(status: TaxDeadlineStatus): string {
    switch (status) {
        case "SudahLapor": return "Sudah Lapor";
        case "BelumLapor": return "Belum Lapor";
        case "Terlambat": return "Terlambat";
        default: return status;
    }
}

function permitStatusVariant(status: PermitCaseStatus): "success" | "warning" | "info" | "default" {
    switch (status) {
        case "Issued": return "success";
        case "Processing": return "info";
        case "WaitingDocument": return "warning";
        case "Draft": return "default";
        default: return "default";
    }
}

function permitStatusLabel(status: PermitCaseStatus): string {
    switch (status) {
        case "Issued": return "Diterbitkan";
        case "Processing": return "Diproses";
        case "WaitingDocument": return "Menunggu Dokumen";
        case "Draft": return "Draft";
        default: return status;
    }
}

function formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function daysUntil(date: Date | string): number {
    const target = new Date(date);
    const now = new Date();
    const diff = target.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function ClientDetailView({ client }: { client: ClientWithRelations }) {
    const [activeTab, setActiveTab] = useState<Tab>("invoices");

    // Compute stats
    const totalInvoiceAmount = client.invoices.reduce((sum, inv) => sum + inv.total, 0);
    const outstandingAmount = client.invoices
        .filter((inv) => inv.status !== "Lunas")
        .reduce((sum, inv) => sum + inv.total, 0);
    const totalDeadlines = client.deadlines.length;
    const completedDeadlines = client.deadlines.filter((d) => d.status === "SudahLapor").length;
    const compliancePercent = totalDeadlines > 0 ? Math.round((completedDeadlines / totalDeadlines) * 100) : 0;
    const activePermits = client.permits.filter(
        (p) => p.status === "Processing" || p.status === "WaitingDocument"
    ).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex items-start gap-4">
                    <Link
                        href="/dashboard/clients"
                        className="mt-1 p-2 rounded-[8px] hover:bg-surface text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">{client.nama}</h1>
                        <p className="text-sm text-muted-foreground font-mono mt-1">NPWP: {client.npwp}</p>
                        <div className="flex items-center gap-2 mt-2">
                            <Badge variant={client.status === "Aktif" ? "success" : "default"}>
                                {client.status === "Aktif" ? "Aktif" : "Tidak Aktif"}
                            </Badge>
                            <Badge variant={client.jenisWP === "Badan" ? "info" : "default"}>
                                {client.jenisWP === "Badan" ? "Badan" : "Orang Pribadi"}
                            </Badge>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contact Info */}
            <div className="rounded-[16px] border border-border bg-card p-6">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Informasi Kontak</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-[8px] bg-surface">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Email</p>
                            <p className="text-sm text-foreground">{client.email || "-"}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-[8px] bg-surface">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Telepon</p>
                            <p className="text-sm text-foreground">{client.telepon || "-"}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-[8px] bg-surface">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Alamat</p>
                            <p className="text-sm text-foreground">{client.alamat || "-"}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-[16px] border border-border bg-card p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-[8px] bg-surface">
                            <DollarSign className="h-4 w-4 text-accent" />
                        </div>
                        <span className="text-xs text-muted-foreground">Total Faktur</span>
                    </div>
                    <p className="text-lg font-bold text-foreground">{formatIDR(totalInvoiceAmount)}</p>
                </div>
                <div className="rounded-[16px] border border-border bg-card p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-[8px] bg-surface">
                            <AlertCircle className="h-4 w-4 text-error" />
                        </div>
                        <span className="text-xs text-muted-foreground">Belum Dibayar</span>
                    </div>
                    <p className="text-lg font-bold text-foreground">{formatIDR(outstandingAmount)}</p>
                </div>
                <div className="rounded-[16px] border border-border bg-card p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-[8px] bg-surface">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                        </div>
                        <span className="text-xs text-muted-foreground">Kepatuhan</span>
                    </div>
                    <p className="text-lg font-bold text-foreground">{compliancePercent}%</p>
                    <p className="text-xs text-muted-foreground">{completedDeadlines}/{totalDeadlines} lapor</p>
                </div>
                <div className="rounded-[16px] border border-border bg-card p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-[8px] bg-surface">
                            <Briefcase className="h-4 w-4 text-blue-600" />
                        </div>
                        <span className="text-xs text-muted-foreground">Izin Aktif</span>
                    </div>
                    <p className="text-lg font-bold text-foreground">{activePermits}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="rounded-[16px] border border-border bg-card overflow-hidden">
                <div className="flex border-b border-border overflow-x-auto">
                    {TAB_CONFIG.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                                activeTab === tab.key
                                    ? "border-accent text-accent"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="p-6">
                    {activeTab === "invoices" && <InvoicesTab invoices={client.invoices} />}
                    {activeTab === "deadlines" && <DeadlinesTab deadlines={client.deadlines} />}
                    {activeTab === "documents" && <DocumentsTab documents={client.documents} />}
                    {activeTab === "permits" && <PermitsTab permits={client.permits} />}
                </div>
            </div>
        </div>
    );
}

/* ─── Invoices Tab ─────────────────────────────────────────────────────────── */

function InvoicesTab({ invoices }: { invoices: ClientWithRelations["invoices"] }) {
    if (invoices.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <Receipt className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Belum ada faktur</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-border">
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">No. Faktur</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Tanggal</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground text-[11px] uppercase tracking-wider hidden sm:table-cell">Jatuh Tempo</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Total</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-surface/60 transition-colors">
                            <td className="px-3 py-3 font-mono text-xs">
                                <Link href={`/dashboard/invoices`} className="text-accent hover:underline">
                                    {inv.nomorInvoice}
                                </Link>
                            </td>
                            <td className="px-3 py-3 text-muted-foreground">{formatDate(inv.tanggal)}</td>
                            <td className="px-3 py-3 text-muted-foreground hidden sm:table-cell">{formatDate(inv.jatuhTempo)}</td>
                            <td className="px-3 py-3 text-right font-medium">{formatIDR(inv.total)}</td>
                            <td className="px-3 py-3">
                                <Badge variant={invoiceStatusVariant(inv.status)}>
                                    {invoiceStatusLabel(inv.status)}
                                </Badge>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/* ─── Deadlines Tab ────────────────────────────────────────────────────────── */

function DeadlinesTab({ deadlines }: { deadlines: ClientWithRelations["deadlines"] }) {
    if (deadlines.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Belum ada batas waktu pajak</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {deadlines.map((dl) => {
                const days = daysUntil(dl.tanggalBatas);
                const isPast = days < 0;
                const isUrgent = days >= 0 && days <= 7;

                return (
                    <div
                        key={dl.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-[12px] border border-border hover:bg-surface/60 transition-colors"
                    >
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-foreground">{dl.jenisPajak}</p>
                                <Badge variant={deadlineStatusVariant(dl.status)}>
                                    {deadlineStatusLabel(dl.status)}
                                </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{dl.deskripsi}</p>
                            <p className="text-xs text-muted-foreground mt-1">Masa Pajak: {dl.masaPajak}</p>
                        </div>
                        <div className="text-right shrink-0">
                            <p className="text-sm font-medium text-foreground">{formatDate(dl.tanggalBatas)}</p>
                            {dl.status === "BelumLapor" && (
                                <p className={`text-xs mt-1 ${isPast ? "text-error" : isUrgent ? "text-amber-600" : "text-muted-foreground"}`}>
                                    {isPast
                                        ? `Lewat ${Math.abs(days)} hari`
                                        : days === 0
                                          ? "Hari ini"
                                          : `${days} hari lagi`}
                                </p>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/* ─── Documents Tab ────────────────────────────────────────────────────────── */

function DocumentsTab({ documents }: { documents: ClientWithRelations["documents"] }) {
    if (documents.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Belum ada dokumen</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
                <div
                    key={doc.id}
                    className="p-4 rounded-[12px] border border-border hover:bg-surface/60 transition-colors"
                >
                    <div className="flex items-start gap-3">
                        <div className="p-2 rounded-[8px] bg-surface shrink-0">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground text-sm truncate">{doc.nama}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="default">{doc.kategori}</Badge>
                                <span className="text-xs text-muted-foreground">{formatFileSize(doc.ukuran)}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">{formatDate(doc.tanggalUpload)}</p>
                            {doc.catatan && (
                                <p className="text-xs text-muted-foreground mt-1 truncate">{doc.catatan}</p>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

/* ─── Permits Tab ──────────────────────────────────────────────────────────── */

function PermitsTab({ permits }: { permits: ClientWithRelations["permits"] }) {
    if (permits.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Belum ada izin usaha</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {permits.map((permit) => (
                <div
                    key={permit.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-[12px] border border-border hover:bg-surface/60 transition-colors"
                >
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-foreground">{permit.caseId}</p>
                            <Badge variant={permitStatusVariant(permit.status)}>
                                {permitStatusLabel(permit.status)}
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {permit.permitType?.name || "Izin Usaha"}
                        </p>
                        {permit.notes && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">{permit.notes}</p>
                        )}
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-sm font-medium text-foreground">{formatIDR(permit.feeAmount)}</p>
                        <p className="text-xs text-muted-foreground mt-1">{formatDate(permit.createdAt)}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}
