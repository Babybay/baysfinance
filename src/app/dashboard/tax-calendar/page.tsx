"use client";

import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { CalendarDays, AlertTriangle, CheckCircle2, Clock, Filter } from "lucide-react";
import { TaxDeadline } from "@/lib/data";
import { useRoles } from "@/lib/hooks/useRoles";
import { getDeadlines, updateDeadlineStatus } from "@/app/actions/deadlines";

const months = [
    "Semua Bulan", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const taxTypes = ["Semua", "PPh 21", "PPh 23", "PPh 25", "PPN", "SPT Tahunan OP", "SPT Tahunan Badan"];

function getStatusBadge(status: TaxDeadline["status"]) {
    switch (status) {
        case "Sudah Lapor":
            return <Badge variant="success"><CheckCircle2 className="h-3 w-3 mr-1" />Sudah Lapor</Badge>;
        case "Belum Lapor":
            return <Badge variant="warning"><Clock className="h-3 w-3 mr-1" />Belum Lapor</Badge>;
        case "Terlambat":
            return <Badge variant="danger"><AlertTriangle className="h-3 w-3 mr-1" />Terlambat</Badge>;
    }
}

function getDaysLeft(dateStr: string): number {
    const now = new Date();
    const target = new Date(dateStr);
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function TaxCalendarPage() {
    const [deadlines, setDeadlines] = useState<TaxDeadline[]>([]);
    const [filterMonth, setFilterMonth] = useState("Semua Bulan");
    const [filterType, setFilterType] = useState("Semua");
    const [filterStatus, setFilterStatus] = useState("Semua");
    const [selectedDeadline, setSelectedDeadline] = useState<TaxDeadline | null>(null);
    const { role, clientId, isLoaded: roleLoaded } = useRoles();
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (!roleLoaded) return;
        loadData();
    }, [roleLoaded, role, clientId]);

    const loadData = async () => {
        setIsLoaded(false);
        const currentClientId = role === "client" ? clientId : undefined;
        const res = await getDeadlines(currentClientId ?? undefined);

        if (res.success && res.data) {
            const formatted = (res.data as any[]).map(d => ({
                ...d,
                tanggalBatas: new Date(d.tanggalBatas).toISOString().split("T")[0],
                status: d.status as TaxDeadline["status"],
                clientName: d.clientName || undefined,
            }));
            setDeadlines(formatted);
        }
        setIsLoaded(true);
    };

    const toggleStatus = async (id: string, newStatus: TaxDeadline["status"]) => {
        const res = await updateDeadlineStatus(id, newStatus);
        if (res.success) {
            setDeadlines(deadlines.map(d => d.id === id ? { ...d, status: newStatus } : d));
            if (selectedDeadline?.id === id) {
                setSelectedDeadline({ ...selectedDeadline, status: newStatus });
            }
        }
    };

    const filtered = deadlines.filter((d) => {
        const date = new Date(d.tanggalBatas);
        const matchMonth = filterMonth === "Semua Bulan" || months[date.getMonth() + 1] === filterMonth;
        const matchType = filterType === "Semua" || d.jenisPajak === filterType;
        const matchStatus = filterStatus === "Semua" || d.status === filterStatus;
        return matchMonth && matchType && matchStatus;
    }).sort((a, b) => new Date(a.tanggalBatas).getTime() - new Date(b.tanggalBatas).getTime());

    const stats = {
        total: deadlines.length,
        sudahLapor: deadlines.filter((d) => d.status === "Sudah Lapor").length,
        belumLapor: deadlines.filter((d) => d.status === "Belum Lapor").length,
        terlambat: deadlines.filter((d) => d.status === "Terlambat").length,
    };

    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-foreground">Kalender Pajak</h1>
                <p className="text-sm text-muted-foreground mt-1">Pantau deadline pelaporan &amp; penyetoran pajak</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-card rounded-[12px] border border-border p-4">
                    <p className="text-xs text-muted-foreground font-medium">Total Deadline</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{stats.total}</p>
                </div>
                <div className="bg-card rounded-[12px] border border-border p-4">
                    <p className="text-xs text-emerald-500 font-medium">Sudah Lapor</p>
                    <p className="text-2xl font-bold text-emerald-500 mt-1">{stats.sudahLapor}</p>
                </div>
                <div className="bg-card rounded-[12px] border border-border p-4">
                    <p className="text-xs text-amber-500 font-medium">Belum Lapor</p>
                    <p className="text-2xl font-bold text-amber-500 mt-1">{stats.belumLapor}</p>
                </div>
                <div className="bg-card rounded-[12px] border border-border p-4">
                    <p className="text-xs text-error font-medium">Terlambat</p>
                    <p className="text-2xl font-bold text-error mt-1">{stats.terlambat}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Filter className="h-4 w-4" /> Filter:
                </div>
                <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}
                    className="h-9 px-3 rounded-[8px] border border-border text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40">
                    {months.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
                    className="h-9 px-3 rounded-[8px] border border-border text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40">
                    {taxTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                    className="h-9 px-3 rounded-[8px] border border-border text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40">
                    <option value="Semua">Semua Status</option>
                    <option value="Sudah Lapor">Sudah Lapor</option>
                    <option value="Belum Lapor">Belum Lapor</option>
                    <option value="Terlambat">Terlambat</option>
                </select>
            </div>

            {/* Deadline List */}
            <div className="space-y-3">
                {!isLoaded ? (
                    <div className="flex items-center justify-center min-h-[200px]">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="bg-card rounded-[12px] border border-border p-12 text-center">
                        <CalendarDays className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
                        <p className="text-muted-foreground">Tidak ada deadline ditemukan</p>
                    </div>
                ) : (
                    filtered.map((d) => {
                        const daysLeft = getDaysLeft(d.tanggalBatas);
                        return (
                            <div
                                key={d.id}
                                onClick={() => setSelectedDeadline(d)}
                                className={`bg-card rounded-[12px] border p-4 cursor-pointer hover:shadow-md transition-all ${d.status === "Terlambat"
                                    ? "border-error/40 bg-error-muted"
                                    : d.status === "Sudah Lapor"
                                        ? "border-emerald-500/30 bg-emerald-500/5"
                                        : "border-border"
                                    }`}
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge variant="info">{d.jenisPajak}</Badge>
                                            {getStatusBadge(d.status)}
                                        </div>
                                        <p className="font-medium text-foreground">{d.deskripsi}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Klien: {d.clientName} • Masa: {d.masaPajak}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-sm font-semibold text-foreground">
                                            {new Date(d.tanggalBatas).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                                        </p>
                                        {d.status !== "Sudah Lapor" && (
                                            <p className={`text-xs mt-1 ${daysLeft < 0 ? "text-error" : daysLeft <= 7 ? "text-amber-500" : "text-muted-foreground"}`}>
                                                {daysLeft < 0 ? `${Math.abs(daysLeft)} hari terlambat` : daysLeft === 0 ? "Hari ini!" : `${daysLeft} hari lagi`}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Detail Modal */}
            <Modal
                isOpen={!!selectedDeadline}
                onClose={() => setSelectedDeadline(null)}
                title="Detail Deadline Pajak"
            >
                {selectedDeadline && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-muted-foreground">Jenis Pajak</p>
                                <p className="font-medium text-foreground">{selectedDeadline.jenisPajak}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Masa Pajak</p>
                                <p className="font-medium text-foreground">{selectedDeadline.masaPajak}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Klien</p>
                                <p className="font-medium text-foreground">{selectedDeadline.clientName}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Batas Waktu</p>
                                <p className="font-medium text-foreground">
                                    {new Date(selectedDeadline.tanggalBatas).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                                </p>
                            </div>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground mb-1">Deskripsi</p>
                            <p className="text-sm text-foreground">{selectedDeadline.deskripsi}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground mb-2">Status</p>
                            {getStatusBadge(selectedDeadline.status)}
                        </div>
                        <div className="flex gap-2 pt-4 border-t border-border">
                            <Button
                                size="default"
                                variant={selectedDeadline.status === "Sudah Lapor" ? "soft" : "accent"}
                                onClick={() => toggleStatus(selectedDeadline.id, "Sudah Lapor")}
                            >
                                <CheckCircle2 className="h-4 w-4 mr-1" /> Tandai Sudah Lapor
                            </Button>
                            <Button
                                size="default"
                                variant="soft"
                                onClick={() => toggleStatus(selectedDeadline.id, "Belum Lapor")}
                            >
                                <Clock className="h-4 w-4 mr-1" /> Belum Lapor
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
