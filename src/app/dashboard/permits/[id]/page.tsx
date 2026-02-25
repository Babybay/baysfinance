"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useRoles } from "@/lib/hooks/useRoles";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import {
    ChevronLeft, Clock, CheckCircle2, AlertCircle,
    FileText, Upload, Download, ShieldCheck,
    MessageSquare, ClipboardCheck, Check, X,
} from "lucide-react";
import { PermitCase, PermitStatus, formatIDR } from "@/lib/data";
import {
    getPermitById, verifyDocument, updatePermitDocument, updateChecklistItem, updatePermitStatus
} from "@/app/actions/permits";

export default function PermitDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { isAdmin } = useRoles();
    const [permit, setPermit] = useState<any | null>(null);
    const [documents, setDocuments] = useState<any[]>([]);
    const [checklists, setChecklists] = useState<any[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [activeTab, setActiveTab] = useState<"docs" | "checklist">("docs");

    // Status update modal
    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [newStatus, setNewStatus] = useState("");
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    const statusProgressMap: Record<string, number> = {
        "Draft": 0,
        "Waiting Document": 10,
        "Verification": 25,
        "Revision Required": 25,
        "Processing": 50,
        "Issued": 75,
        "Completed": 100,
        "Cancelled": 0,
        "On Hold": 0,
    };

    const workflowStatuses = [
        "Draft", "Waiting Document", "Verification", "Revision Required",
        "Processing", "Issued", "Completed", "Cancelled", "On Hold",
    ];

    // Reject modal
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [rejectComment, setRejectComment] = useState("");
    const [processingDocId, setProcessingDocId] = useState<string | null>(null);

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
                createdAt: new Date(p.createdAt).toISOString().split("T")[0],
                updatedAt: new Date(p.updatedAt).toISOString().split("T")[0],
            });
            setDocuments(p.documents || []);
            setChecklists(p.checklists || []);
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
            const res = await fetch("/api/upload", { method: "POST", body: formData });
            const data = await res.json();
            if (data.success) {
                const dbRes = await updatePermitDocument(activeDocId, data.key);
                if (dbRes.success) {
                    setDocuments(docs => docs.map(d =>
                        d.id === activeDocId ? { ...d, verificationStatus: "Pending", fileUrl: data.key, comments: null } : d
                    ));
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsUploading(false);
            setActiveDocId(null);
            e.target.value = "";
        }
    };

    const handleVerify = async (docId: string, status: string, comments: string | null = null) => {
        const res = await verifyDocument(docId, status, comments);
        if (res.success) {
            setDocuments(docs => docs.map(d =>
                d.id === docId ? { ...d, verificationStatus: status, comments } : d
            ));
            if (status === "Rejected") {
                setRejectModalOpen(false);
                setRejectComment("");
                setProcessingDocId(null);
            }
        }
    };

    const handleChecklistToggle = async (itemId: string, checked: boolean) => {
        const res = await updateChecklistItem(itemId, checked);
        if (res.success) {
            setChecklists(items => items.map(item =>
                item.id === itemId
                    ? { ...item, isChecked: checked, checkedAt: checked ? new Date().toISOString() : null }
                    : item
            ));
        }
    };

    const handleStatusUpdate = async () => {
        if (!newStatus || !permit) return;
        setIsUpdatingStatus(true);
        const progress = statusProgressMap[newStatus] ?? permit.progress;
        const res = await updatePermitStatus(permit.id, newStatus, progress);
        if (res.success) {
            setPermit((prev: any) => ({ ...prev, status: newStatus, progress }));
            setStatusModalOpen(false);
        }
        setIsUpdatingStatus(false);
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
                <Button variant="transparent" className="mt-6 border border-border" onClick={() => router.back()}>
                    <ChevronLeft className="h-4 w-4 mr-2" /> Kembali
                </Button>
            </div>
        );
    }

    const steps = [
        { key: "Draft", label: "Pengajuan", progress: 0 },
        { key: "Verification", label: "Verifikasi", progress: 25 },
        { key: "Processing", label: "Proses", progress: 50 },
        { key: "Issued", label: "Terbit", progress: 75 },
        { key: "Completed", label: "Selesai", progress: 100 },
    ];

    const getStatusVariant = (status: string) => {
        switch (status) {
            case "Issued": case "Completed": return "success";
            case "Processing": case "Verification": return "info";
            case "Waiting Document": case "Revision Required": return "warning";
            case "Cancelled": return "danger";
            default: return "default";
        }
    };

    const approvedDocs = documents.filter(d => d.verificationStatus === "Approved").length;
    const checkedItems = checklists.filter(c => c.isChecked).length;

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-12">
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />

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
                            <span className="font-mono text-accent">{permit.caseId}</span> • {permit.clientName}
                            {permit.permitType && <> • {permit.permitType.name}</>}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="soft"><MessageSquare className="h-4 w-4 mr-2" /> Hubungi Advisor</Button>
                    {isAdmin && <Button variant="accent" onClick={() => { setNewStatus(permit.status); setStatusModalOpen(true); }}>Update Status</Button>}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Workflow Stepper */}
                    <div className="bg-card rounded-[16px] border border-border p-6 shadow-sm">
                        <h2 className="font-serif text-lg mb-6">Alur Pengurusan</h2>
                        <div className="relative flex justify-between">
                            <div className="absolute top-4 left-0 right-0 h-0.5 bg-surface z-0" />
                            <div className="absolute top-4 left-0 h-0.5 bg-accent z-0 transition-all duration-500" style={{ width: `${permit.progress}%` }} />
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
                                            }`}>{step.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="bg-card rounded-[16px] border border-border shadow-sm overflow-hidden">
                        <div className="flex border-b border-border">
                            <button
                                onClick={() => setActiveTab("docs")}
                                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === "docs" ? "text-accent border-b-2 border-accent bg-accent-muted/30" : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                <FileText className="h-4 w-4" /> Dokumen ({approvedDocs}/{documents.length})
                            </button>
                            <button
                                onClick={() => setActiveTab("checklist")}
                                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === "checklist" ? "text-accent border-b-2 border-accent bg-accent-muted/30" : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                <ClipboardCheck className="h-4 w-4" /> Persetujuan ({checkedItems}/{checklists.length})
                            </button>
                        </div>

                        <div className="p-6">
                            {/* Documents Tab */}
                            {activeTab === "docs" && (
                                <div className="space-y-3">
                                    {isUploading && (
                                        <div className="flex items-center gap-2 text-xs text-accent animate-pulse mb-2">
                                            <Clock className="h-3 w-3" /> Mengunggah...
                                        </div>
                                    )}
                                    {documents.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-4">Belum ada dokumen.</p>
                                    ) : (
                                        documents.map((doc) => (
                                            <div key={doc.id} className="flex flex-col gap-2 p-3 rounded-[12px] bg-surface border border-transparent hover:border-border transition-colors">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-[8px] bg-card flex items-center justify-center border border-border">
                                                            <FileText className="h-5 w-5 text-muted" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-foreground">{doc.docType}</p>
                                                            <p className="text-xs text-muted-foreground">Persyaratan</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {doc.verificationStatus === "Approved" ? (
                                                            <Badge variant="success">Terverifikasi</Badge>
                                                        ) : doc.verificationStatus === "Rejected" ? (
                                                            <Badge variant="danger">Perlu Revisi</Badge>
                                                        ) : doc.fileUrl ? (
                                                            <Badge variant="info">Menunggu Verifikasi</Badge>
                                                        ) : (
                                                            <Badge variant="default">Wajib Unggah</Badge>
                                                        )}
                                                        {!doc.fileUrl || doc.verificationStatus === "Rejected" ? (
                                                            <Button variant="soft" onClick={() => handleUploadClick(doc.id)}>
                                                                <Upload className="h-3 w-3 mr-1" /> {doc.verificationStatus === "Rejected" ? "Unggah Ulang" : "Unggah"}
                                                            </Button>
                                                        ) : (
                                                            <Button variant="soft" size="icon" onClick={() => window.open(`/api/documents/presigned?key=${doc.fileUrl}`)}>
                                                                <Download className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                                {isAdmin && doc.fileUrl && doc.verificationStatus === "Pending" && (
                                                    <div className="flex gap-2 mt-2 pt-2 border-t border-border/50">
                                                        <Button size="default" variant="accent" className="h-8 text-xs px-3" onClick={() => handleVerify(doc.id, "Approved")}>Approve</Button>
                                                        <Button size="default" variant="soft" className="h-8 text-xs px-3 text-error hover:bg-error-muted" onClick={() => { setProcessingDocId(doc.id); setRejectModalOpen(true); }}>Reject</Button>
                                                    </div>
                                                )}
                                                {doc.verificationStatus === "Rejected" && doc.comments && (
                                                    <div className="mt-2 p-2 rounded-[8px] bg-error-muted border border-error/20 text-xs text-error">
                                                        <span className="font-bold">Alasan Penolakan:</span> {doc.comments}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* Checklist Tab */}
                            {activeTab === "checklist" && (
                                <div className="space-y-3">
                                    {checklists.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-4">Tidak ada item persetujuan.</p>
                                    ) : (
                                        checklists.map((item) => (
                                            <label
                                                key={item.id}
                                                className={`flex items-start gap-3 p-3 rounded-[12px] border-2 transition-all ${item.isChecked
                                                    ? "border-accent bg-accent-muted/50 cursor-default"
                                                    : "border-border bg-surface hover:border-accent/30 cursor-pointer"
                                                    }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={item.isChecked}
                                                    onChange={() => {
                                                        if (!item.isChecked || isAdmin) {
                                                            handleChecklistToggle(item.id, !item.isChecked);
                                                        }
                                                    }}
                                                    disabled={item.isChecked && !isAdmin}
                                                    className="mt-0.5 h-4 w-4 rounded border-border text-accent focus:ring-accent shrink-0"
                                                />
                                                <div className="flex-1">
                                                    <p className={`text-sm font-medium ${item.isChecked ? "text-accent" : "text-foreground"}`}>
                                                        {item.label}
                                                    </p>
                                                    {item.description && (
                                                        <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                                                    )}
                                                    {item.isChecked && item.checkedAt && (
                                                        <p className="text-[10px] text-accent mt-1 flex items-center gap-1">
                                                            <CheckCircle2 className="h-3 w-3" />
                                                            Disetujui pada {new Date(item.checkedAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                                                        </p>
                                                    )}
                                                </div>
                                            </label>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Case Info */}
                <div className="space-y-6">
                    <div className="bg-card rounded-[16px] border border-border p-6 shadow-sm">
                        <h2 className="font-serif text-lg mb-4">Informasi Kasus</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Jenis Perijinan</label>
                                <p className="text-sm font-medium mt-1">{permit.permitType?.name || permit.serviceType}</p>
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Layanan</label>
                                <p className="text-sm font-medium mt-1">{permit.serviceType}</p>
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Kategori Risiko</label>
                                <div className="mt-1 flex items-center gap-2">
                                    <ShieldCheck className={`h-4 w-4 ${permit.riskCategory === "High" ? "text-error" :
                                        permit.riskCategory === "Medium-High" ? "text-warning" : "text-success"
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

                    {/* Progress Summary */}
                    <div className="bg-card rounded-[16px] border border-border p-6 shadow-sm">
                        <h2 className="font-serif text-lg mb-4">Ringkasan</h2>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Dokumen</span>
                                <span className="text-sm font-semibold">{approvedDocs}/{documents.length}</span>
                            </div>
                            <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
                                <div className="h-full bg-accent transition-all" style={{ width: documents.length ? `${(approvedDocs / documents.length) * 100}%` : "0%" }} />
                            </div>
                            <div className="flex justify-between items-center mt-3">
                                <span className="text-sm text-muted-foreground">Persetujuan</span>
                                <span className="text-sm font-semibold">{checkedItems}/{checklists.length}</span>
                            </div>
                            <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
                                <div className="h-full bg-accent transition-all" style={{ width: checklists.length ? `${(checkedItems / checklists.length) * 100}%` : "0%" }} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-accent-muted rounded-[16px] border border-accent/10 p-6">
                        <h2 className="text-accent font-medium text-sm mb-2">Butuh Bantuan?</h2>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                            Advisor kami siap membantu Anda jika terdapat kendala dalam proses perijinan.
                        </p>
                        <Button variant="soft" className="w-full bg-card border-accent/20 text-accent hover:bg-accent-muted transition-colors">
                            Buka Tiket Support
                        </Button>
                    </div>
                </div>
            </div>

            {/* Rejection Modal */}
            <Modal isOpen={rejectModalOpen} onClose={() => setRejectModalOpen(false)} title="Tolak Dokumen" size="md">
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">Berikan alasan mengapa dokumen ini ditolak.</p>
                    <Textarea
                        placeholder="Contoh: KTP kurang jelas atau sudah kadaluarsa..."
                        value={rejectComment}
                        onChange={(e) => setRejectComment(e.target.value)}
                        className="min-h-[100px]"
                    />
                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="soft" onClick={() => setRejectModalOpen(false)}>Batal</Button>
                        <Button
                            variant="accent"
                            className="bg-error hover:bg-error-hover text-white"
                            onClick={() => processingDocId && handleVerify(processingDocId, "Rejected", rejectComment)}
                            disabled={!rejectComment}
                        >
                            Konfirmasi Tolak
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Status Update Modal */}
            <Modal isOpen={statusModalOpen} onClose={() => setStatusModalOpen(false)} title="Update Status Perijinan" size="md">
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">Pilih status baru untuk kasus <span className="font-mono text-accent">{permit.caseId}</span></p>
                    <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1 block">Status Baru</label>
                        <select
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value)}
                            className="w-full h-10 rounded-[8px] border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                        >
                            {workflowStatuses.map((s) => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>
                    <div className="p-3 rounded-[8px] bg-surface border border-border">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Progress</span>
                            <span className="font-semibold text-foreground">{statusProgressMap[newStatus] ?? 0}%</span>
                        </div>
                        <div className="w-full h-2 bg-card rounded-full overflow-hidden">
                            <div className="h-full bg-accent transition-all duration-300" style={{ width: `${statusProgressMap[newStatus] ?? 0}%` }} />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="soft" onClick={() => setStatusModalOpen(false)}>Batal</Button>
                        <Button
                            variant="accent"
                            onClick={handleStatusUpdate}
                            disabled={isUpdatingStatus || newStatus === permit.status}
                        >
                            {isUpdatingStatus ? "Menyimpan..." : "Simpan Perubahan"}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
