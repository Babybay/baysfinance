"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useRoles } from "@/lib/hooks/useRoles";
import { useI18n } from "@/lib/i18n";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
    ChevronLeft,
    Clock,
    CheckCircle2,
    AlertCircle,
    FileText,
    Upload,
    MoreVertical,
    Download,
    ExternalLink,
    ShieldCheck,
    MessageSquare
} from "lucide-react";
import {
    BusinessPermitCase,
    BusinessPermitStatus,
    formatIDR
} from "@/lib/data";
import { getPermitById } from "@/app/actions/business-permits";

export default function BusinessPermitDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { t } = useI18n();
    const { isAdmin } = useRoles();
    const [permit, setPermit] = useState<BusinessPermitCase | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [documents, setDocuments] = useState([
        { id: "d1", name: "KTP Direktur", status: "Approved", key: "" },
        { id: "d2", name: "NPWP Perusahaan", status: "Approved", key: "" },
        { id: "d3", name: "Akta Pendirian", status: "Pending", key: "" },
        { id: "d4", name: "SK Kemenkumham", status: "Missing", key: "" },
        { id: "d5", name: "Bukti Alamat Bisnis", status: "Missing", key: "" },
    ]);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [activeDocId, setActiveDocId] = useState<string | null>(null);

    useEffect(() => {
        loadPermit();
    }, [id]);

    const loadPermit = async () => {
        setIsLoaded(false);
        const res = await getPermitById(id as string);
        if (res.success && res.data) {
            const p = res.data as any;
            setPermit({
                ...p,
                status: p.status as BusinessPermitStatus,
                riskCategory: p.riskCategory as BusinessPermitCase["riskCategory"],
                createdAt: new Date(p.createdAt).toISOString().split("T")[0],
                updatedAt: new Date(p.updatedAt).toISOString().split("T")[0],
            });
        }
        setIsLoaded(true);
    };

    const handleUploadClick = (docId: string) => {
        setActiveDocId(docId);
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeDocId) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();

            if (data.success) {
                setDocuments(docs => docs.map(d =>
                    d.id === activeDocId
                        ? { ...d, status: "Pending", key: data.key }
                        : d
                ));
                alert("Dokumen berhasil diunggah!");
            } else {
                alert("Gagal mengunggah: " + data.error);
            }
        } catch (error) {
            console.error(error);
            alert("Terjadi kesalahan saat mengunggah.");
        } finally {
            setIsUploading(false);
            setActiveDocId(null);
            e.target.value = "";
        }
    };

    const handleDownload = async (key: string) => {
        if (!key) {
            alert("File belum tersedia untuk diunduh.");
            return;
        }

        try {
            const res = await fetch(`/api/documents/presigned?key=${key}`);
            const data = await res.json();
            if (data.url) {
                window.open(data.url, "_blank");
            } else {
                alert("Gagal mengambil link unduhan: " + data.error);
            }
        } catch (error) {
            console.error(error);
            alert("Terjadi kesalahan saat mengunduh.");
        }
    };

    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
            </div>
        );
    }

    if (!permit) {
        return (
            <div className="text-center py-20 bg-card rounded-[16px] border border-border">
                <AlertCircle className="h-12 w-12 text-muted mx-auto mb-4" />
                <h2 className="font-serif text-xl text-foreground">Kasus Tidak Ditemukan</h2>
                <p className="text-muted-foreground mt-2">Data perijinan dengan ID tersebut tidak tersedia.</p>
                <Button variant="transparent" className="mt-6 border border-border" onClick={() => router.back()}>
                    <ChevronLeft className="h-4 w-4 mr-2" /> Kembali
                </Button>
            </div>
        );
    }

    const steps = [
        { key: "Draft", label: "Service Entry", progress: 0 },
        { key: "Verification", label: "Document Collection", progress: 25 },
        { key: "Processing OSS", label: "OSS Submission", progress: 50 },
        { key: "Issued", label: "Permit Issued", progress: 75 },
        { key: "Completed", label: "Completed", progress: 100 },
    ];

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
                return "default";
            default:
                return "default";
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-12">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
            />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="soft" size="icon" onClick={() => router.back()}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="font-serif text-2xl text-foreground">Detail Perijinan</h1>
                            <Badge variant={getStatusVariant(permit.status)}>{permit.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                            {permit.caseId} • {permit.clientName}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="soft"><MessageSquare className="h-4 w-4 mr-2" /> Hubungi Advisor</Button>
                    {isAdmin && <Button variant="accent">Update Status</Button>}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Progress and Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Workflow Stepper */}
                    <div className="bg-card rounded-[16px] border border-border p-6 shadow-sm">
                        <h2 className="font-serif text-lg mb-6">Alur Pengurusan</h2>
                        <div className="relative flex justify-between">
                            <div className="absolute top-4 left-0 right-0 h-0.5 bg-surface z-0" />
                            <div
                                className="absolute top-4 left-0 h-0.5 bg-accent z-0 transition-all duration-500"
                                style={{ width: `${permit.progress}%` }}
                            />
                            {steps.map((step, idx) => {
                                const isCompleted = permit.progress > step.progress;
                                const isCurrent = permit.progress === step.progress;
                                return (
                                    <div key={idx} className="relative z-10 flex flex-col items-center">
                                        <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center transition-colors ${isCompleted ? "bg-accent border-accent text-accent-foreground" :
                                            isCurrent ? "bg-card border-accent text-accent" :
                                                "bg-card border-border text-muted"
                                            }`}>
                                            {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <span className="text-xs font-bold">{idx + 1}</span>}
                                        </div>
                                        <span className={`text-[10px] font-medium mt-2 text-center max-w-[60px] leading-tight ${isCurrent ? "text-accent" : "text-muted-foreground"
                                            }`}>
                                            {step.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Document Checklist */}
                    <div className="bg-card rounded-[16px] border border-border p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="font-serif text-lg">Dokumen Persyaratan</h2>
                            {isUploading && (
                                <div className="flex items-center gap-2 text-xs text-accent animate-pulse">
                                    <Clock className="h-3 w-3" /> Mengunggah...
                                </div>
                            )}
                        </div>
                        <div className="space-y-3">
                            {documents.map((doc, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 rounded-[12px] bg-surface border border-transparent hover:border-border transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-[8px] bg-card flex items-center justify-center border border-border">
                                            <FileText className="h-5 w-5 text-muted" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-foreground">{doc.name}</p>
                                            <p className="text-xs text-muted-foreground">Persyaratan Wajib</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {doc.status === "Approved" ? (
                                            <Badge variant="success">Terverifikasi</Badge>
                                        ) : doc.status === "Pending" ? (
                                            <Badge variant="info">Menunggu Verifikasi</Badge>
                                        ) : (
                                            <Badge variant="default">Wajib Unggah</Badge>
                                        )}

                                        {doc.status === "Missing" ? (
                                            <Button variant="soft" onClick={() => handleUploadClick(doc.id)}>
                                                <Upload className="h-3 w-3 mr-1" /> Unggah
                                            </Button>
                                        ) : (
                                            <Button variant="soft" size="icon" onClick={() => handleDownload(doc.key)}>
                                                <Download className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Case Info */}
                <div className="space-y-6">
                    <div className="bg-card rounded-[16px] border border-border p-6 shadow-sm">
                        <h2 className="font-serif text-lg mb-4">Informasi Kasus</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Jenis Layanan</label>
                                <p className="text-sm font-medium mt-1">{permit.serviceType}</p>
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Kategori Risiko</label>
                                <div className="mt-1 flex items-center gap-2">
                                    <ShieldCheck className={`h-4 w-4 ${permit.riskCategory === "High" ? "text-error" :
                                        permit.riskCategory === "Medium-High" ? "text-warning" :
                                            "text-success"
                                        }`} />
                                    <p className="text-sm font-medium">{permit.riskCategory}</p>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Biaya Layanan</label>
                                <p className="text-sm font-medium mt-1">{formatIDR(permit.feeAmount)}</p>
                            </div>
                            <div className="pt-4 border-t border-border">
                                <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Terakhir Diperbarui</label>
                                <p className="text-sm text-foreground mt-1 flex items-center gap-2">
                                    <Clock className="h-3 w-3 text-muted" />
                                    {new Date(permit.updatedAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-accent-muted rounded-[16px] border border-accent/10 p-6">
                        <h2 className="text-accent font-medium text-sm mb-2">Butuh Bantuan?</h2>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                            Advisor kami siap membantu Anda jika terdapat kendala dalam pengumpulan dokumen atau proses di portal OSS.
                        </p>
                        <Button variant="soft" className="w-full bg-card border-accent/20 text-accent hover:bg-accent-muted transition-colors">
                            Buka Tiket Support
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
