"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n";
import {
    Search, Plus, Eye, Filter, ArrowUpDown
} from "lucide-react";
import { PermitCase, PermitStatus, formatIDR } from "@/lib/data";

interface PermitListProps {
    permits: PermitCase[];
    permitTypes: any[];
    isAdmin: boolean;
}

export function PermitList({ permits, permitTypes, isAdmin }: PermitListProps) {
    const { t } = useI18n();
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [typeFilter, setTypeFilter] = useState<string>("all");

    const filteredPermits = permits.filter(p => {
        const matchesSearch =
            p.caseId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.serviceType.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" || p.status === statusFilter;
        const matchesType = typeFilter === "all" || p.permitTypeId === typeFilter;
        return matchesSearch && matchesStatus && matchesType;
    });

    const getStatusVariant = (status: PermitStatus) => {
        switch (status) {
            case "Issued":
            case "Completed":
                return "success";
            case "Processing":
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

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="font-serif text-2xl text-foreground">Perijinan</h1>
                    <p className="text-sm text-muted-foreground mt-1">Kelola semua pengajuan perijinan secara terpusat.</p>
                </div>
                <Link href="/dashboard/permits/new">
                    <Button variant="accent">
                        <Plus className="h-4 w-4 mr-2" />
                        Buat Pengajuan Baru
                    </Button>
                </Link>
            </div>

            <div className="bg-card rounded-[16px] border border-border p-4 md:p-6 shadow-sm">
                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Cari ID, Klien, atau Layanan..."
                            className="w-full pl-10 pr-4 py-2 bg-surface border border-border rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <select
                            className="bg-surface border border-border rounded-[8px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                        >
                            <option value="all">Semua Jenis</option>
                            {permitTypes.map(pt => (
                                <option key={pt.id} value={pt.id}>{pt.name}</option>
                            ))}
                        </select>
                        <select
                            className="bg-surface border border-border rounded-[8px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">Semua Status</option>
                            <option value="Draft">Draft</option>
                            <option value="Waiting Document">Menunggu Dokumen</option>
                            <option value="Verification">Verifikasi</option>
                            <option value="Processing">Proses</option>
                            <option value="Issued">Terbit</option>
                            <option value="Completed">Selesai</option>
                        </select>
                    </div>
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border text-left">
                                <th className="pb-4 pt-0 font-medium text-xs text-muted-foreground uppercase tracking-wider">ID Kasus</th>
                                <th className="pb-4 pt-0 font-medium text-xs text-muted-foreground uppercase tracking-wider">Jenis</th>
                                <th className="pb-4 pt-0 font-medium text-xs text-muted-foreground uppercase tracking-wider">Klien</th>
                                <th className="pb-4 pt-0 font-medium text-xs text-muted-foreground uppercase tracking-wider">Layanan</th>
                                <th className="pb-4 pt-0 font-medium text-xs text-muted-foreground uppercase tracking-wider">Progress</th>
                                <th className="pb-4 pt-0 font-medium text-xs text-muted-foreground uppercase tracking-wider">Status</th>
                                <th className="pb-4 pt-0 font-medium text-xs text-muted-foreground uppercase tracking-wider text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredPermits.map((p) => (
                                <tr key={p.id} className="group hover:bg-surface/50 transition-colors">
                                    <td className="py-4 font-mono text-sm font-medium text-foreground">{p.caseId}</td>
                                    <td className="py-4">
                                        <Badge variant="default" className="text-[11px]">
                                            {(p as any).permitType?.name || "—"}
                                        </Badge>
                                    </td>
                                    <td className="py-4 text-sm text-foreground">{p.clientName}</td>
                                    <td className="py-4 text-sm text-muted-foreground">{p.serviceType}</td>
                                    <td className="py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-24 h-1.5 bg-surface rounded-full overflow-hidden">
                                                <div className="h-full bg-accent transition-all duration-500" style={{ width: `${p.progress}%` }} />
                                            </div>
                                            <span className="text-xs font-medium text-muted">{p.progress}%</span>
                                        </div>
                                    </td>
                                    <td className="py-4">
                                        <Badge variant={getStatusVariant(p.status)} className="capitalize">{p.status}</Badge>
                                    </td>
                                    <td className="py-4 text-right">
                                        <Link href={`/dashboard/permits/${p.id}`}>
                                            <Button variant="soft"><Eye className="h-4 w-4 mr-2" /> Lihat</Button>
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {filteredPermits.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="py-10 text-center text-muted-foreground">
                                        Tidak ada data yang ditemukan.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-4">
                    {filteredPermits.map((p) => (
                        <div key={p.id} className="bg-surface rounded-[12px] p-4 border border-border">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <p className="font-mono font-medium text-foreground text-sm">{p.caseId}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{p.clientName}</p>
                                </div>
                                <Badge variant={getStatusVariant(p.status)}>{p.status}</Badge>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">{p.serviceType}</span>
                                    <span className="font-medium">{p.progress}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-card rounded-full overflow-hidden">
                                    <div className="h-full bg-accent transition-all" style={{ width: `${p.progress}%` }} />
                                </div>
                            </div>
                            <div className="mt-4">
                                <Link href={`/dashboard/permits/${p.id}`} className="w-full">
                                    <Button variant="soft" className="w-full"><Eye className="h-4 w-4 mr-2" /> Lihat</Button>
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
