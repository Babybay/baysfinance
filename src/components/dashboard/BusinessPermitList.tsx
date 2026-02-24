"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n";
import {
    Search,
    Plus,
    MoreHorizontal,
    Eye,
    FileEdit,
    Trash2,
    Filter,
    ArrowUpDown
} from "lucide-react";
import {
    BusinessPermitCase,
    BusinessPermitStatus,
    formatIDR
} from "@/lib/data";

interface BusinessPermitListProps {
    permits: BusinessPermitCase[];
    isAdmin: boolean;
}

export function BusinessPermitList({ permits, isAdmin }: BusinessPermitListProps) {
    const { t } = useI18n();
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    const filteredPermits = permits.filter(p => {
        const matchesSearch =
            p.caseId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.serviceType.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === "all" || p.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const getStatusVariant = (status: BusinessPermitStatus) => {
        switch (status) {
            case "Issued":
            case "Completed":
                return "success";
            case "Processing OSS":
            case "Verification":
                return "info";
            case "Waiting Document":
            case "Revision Required":
                return "warning";
            case "Cancelled":
                return "danger";
            case "On Hold":
                return "neutral";
            default:
                return "default";
        }
    };

    const getStatusLabel = (status: BusinessPermitStatus) => {
        const labels: Record<string, string> = {
            "Draft": t.businessPermits.status.draft,
            "Waiting Document": t.businessPermits.status.waitingDocument,
            "Verification": t.businessPermits.status.verification,
            "Revision Required": t.businessPermits.status.revisionRequired,
            "Processing OSS": t.businessPermits.status.processingOSS,
            "Issued": t.businessPermits.status.issued,
            "Completed": t.businessPermits.status.completed,
            "Cancelled": t.businessPermits.status.cancelled,
            "On Hold": t.businessPermits.status.onHold,
        };
        return labels[status] || status;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="font-serif text-2xl text-foreground">{t.businessPermits.title}</h1>
                    <p className="text-sm text-muted-foreground mt-1">{t.businessPermits.subtitle}</p>
                </div>
                <Link href="/dashboard/business-permits/new">
                    <Button variant="accent">
                        <Plus className="h-4 w-4 mr-2" />
                        {t.businessPermits.newCase}
                    </Button>
                </Link>
            </div>

            <div className="bg-card rounded-[16px] border border-border p-4 md:p-6 shadow-sm">
                {/* Search and Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Cari ID Kasus, Klien, atau Layanan..."
                            className="w-full pl-10 pr-4 py-2 bg-surface border border-border rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <select
                            className="bg-surface border border-border rounded-[8px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">Semua Status</option>
                            <option value="Draft">Draft</option>
                            <option value="Waiting Document">Menunggu Dokumen</option>
                            <option value="Verification">Verifikasi</option>
                            <option value="Processing OSS">Proses OSS</option>
                            <option value="Issued">Terbit</option>
                        </select>
                        <Button variant="soft" size="icon">
                            <Filter className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border text-left">
                                <th className="pb-4 pt-0 font-medium text-xs text-muted-foreground uppercase tracking-wider tabular-nums">
                                    <button className="flex items-center gap-1 hover:text-foreground transition-colors">
                                        ID {t.businessPermits.table.caseId} <ArrowUpDown className="h-3 w-3" />
                                    </button>
                                </th>
                                <th className="pb-4 pt-0 font-medium text-xs text-muted-foreground uppercase tracking-wider">{t.businessPermits.table.client}</th>
                                <th className="pb-4 pt-0 font-medium text-xs text-muted-foreground uppercase tracking-wider">{t.businessPermits.table.type}</th>
                                <th className="pb-4 pt-0 font-medium text-xs text-muted-foreground uppercase tracking-wider">{t.businessPermits.table.progress}</th>
                                <th className="pb-4 pt-0 font-medium text-xs text-muted-foreground uppercase tracking-wider">{t.businessPermits.table.status}</th>
                                <th className="pb-4 pt-0 font-medium text-xs text-muted-foreground uppercase tracking-wider text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredPermits.map((p) => (
                                <tr key={p.id} className="group hover:bg-surface/50 transition-colors">
                                    <td className="py-4 font-medium text-sm text-foreground">{p.caseId}</td>
                                    <td className="py-4 text-sm text-foreground">{p.clientName}</td>
                                    <td className="py-4 text-sm text-muted-foreground">{p.serviceType}</td>
                                    <td className="py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-24 h-1.5 bg-surface rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-accent transition-all duration-500"
                                                    style={{ width: `${p.progress}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-medium text-muted">{p.progress}%</span>
                                        </div>
                                    </td>
                                    <td className="py-4">
                                        <Badge variant={getStatusVariant(p.status)} className="capitalize">
                                            {getStatusLabel(p.status)}
                                        </Badge>
                                    </td>
                                    <td className="py-4 text-right">
                                        <Link href={`/dashboard/business-permits/${p.id}`}>
                                            <Button variant="soft">
                                                <Eye className="h-4 w-4 mr-2" />
                                                Lihat
                                            </Button>
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {filteredPermits.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="py-10 text-center text-muted-foreground">
                                        Tidak ada data yang ditemukan.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                    {filteredPermits.map((p) => (
                        <div key={p.id} className="bg-surface rounded-[12px] p-4 border border-border">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <p className="font-medium text-foreground">{p.caseId}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{p.clientName}</p>
                                </div>
                                <Badge variant={getStatusVariant(p.status)}>
                                    {getStatusLabel(p.status)}
                                </Badge>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">{p.serviceType}</span>
                                    <span className="font-medium">{p.progress}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-card rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-accent transition-all"
                                        style={{ width: `${p.progress}%` }}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-4">
                                <Link href={`/dashboard/business-permits/${p.id}`} className="w-full">
                                    <Button variant="soft" className="w-full">
                                        <Eye className="h-4 w-4 mr-2" /> Lihat
                                    </Button>
                                </Link>
                                {isAdmin && (
                                    <Button variant="soft" className="w-full">
                                        <FileEdit className="h-4 w-4 mr-2" /> Edit
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
