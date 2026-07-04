"use client";

import React, { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
    AlertTriangle,
    BookOpenCheck,
    CheckCircle2,
    FileSpreadsheet,
    Layers3,
    Loader2,
    Plus,
    UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { useSelectedClient } from "@/lib/hooks/useSelectedClient";
import {
    classifyAnnualTaxWorkbookUpload,
    createAnnualTaxBatch,
    getAnnualTaxBatchDetail,
    getAnnualTaxBatches,
} from "@/app/actions/annual-tax";

interface AnnualTaxBatchListItem {
    id: string;
    taxYear: number;
    status: string;
    companyName: string | null;
    npwp: string | null;
    createdAt: string;
    _count: {
        workbooks: number;
        sections: number;
        issues: number;
        exports: number;
    };
}

interface AnnualTaxSheetRow {
    id: string;
    sheetName: string;
    detectedType: string;
    confidence: number;
    rangeRef: string | null;
    rowCount: number;
    cellCount: number;
    status: string;
}

interface AnnualTaxWorkbookRow {
    id: string;
    fileName: string;
    sheetCount: number;
    createdAt: string;
    sheets: AnnualTaxSheetRow[];
}

interface AnnualTaxSectionRow {
    id: string;
    sectionType: string;
    title: string;
    status: string;
}

interface AnnualTaxIssueRow {
    id: string;
    severity: string;
    code: string;
    message: string;
    status: string;
}

interface AnnualTaxBatchDetail {
    id: string;
    taxYear: number;
    status: string;
    companyName: string | null;
    npwp: string | null;
    workbooks: AnnualTaxWorkbookRow[];
    sections: AnnualTaxSectionRow[];
    issues: AnnualTaxIssueRow[];
}

const statusVariant: Record<string, "default" | "info" | "success" | "warning" | "danger"> = {
    Draft: "default",
    Parsed: "info",
    Mapped: "info",
    Review: "warning",
    Approved: "success",
    Exported: "success",
    Archived: "default",
};

export function AnnualTaxView() {
    const { selectedClientId, clients } = useSelectedClient();
    const toast = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isPending, startTransition] = useTransition();
    const [batches, setBatches] = useState<AnnualTaxBatchListItem[]>([]);
    const [activeBatchId, setActiveBatchId] = useState("");
    const [batchDetail, setBatchDetail] = useState<AnnualTaxBatchDetail | null>(null);
    const [taxYear, setTaxYear] = useState(String(new Date().getFullYear() - 1));

    const selectedClient = useMemo(
        () => clients.find((client) => client.id === selectedClientId),
        [clients, selectedClientId],
    );

    useEffect(() => {
        if (!selectedClientId) return;

        startTransition(() => {
            void (async () => {
                const response = await getAnnualTaxBatches(selectedClientId);
                if (response.success) {
                    const nextBatches = response.data as AnnualTaxBatchListItem[];
                    const firstBatchId = nextBatches[0]?.id ?? "";
                    setBatches(nextBatches);
                    setActiveBatchId(firstBatchId);
                    if (!firstBatchId) setBatchDetail(null);
                } else {
                    toast.error(response.error || "Gagal memuat batch SPT Tahunan");
                }
            })();
        });
    }, [selectedClientId, toast]);

    useEffect(() => {
        if (!activeBatchId) return;

        startTransition(() => {
            void (async () => {
                const response = await getAnnualTaxBatchDetail(activeBatchId);
                if (!response.success) {
                    toast.error(response.error || "Gagal memuat detail batch");
                    return;
                }

                setBatchDetail(response.data as AnnualTaxBatchDetail);
            })();
        });
    }, [activeBatchId, toast]);

    const refreshCurrentClient = (detailBatchId = activeBatchId) => {
        if (!selectedClientId) return;
        startTransition(() => {
            void (async () => {
                const response = await getAnnualTaxBatches(selectedClientId);
                if (response.success) {
                    const nextBatches = response.data as AnnualTaxBatchListItem[];
                    setBatches(nextBatches);
                    if (detailBatchId) {
                        const detail = await getAnnualTaxBatchDetail(detailBatchId);
                        if (detail.success && detail.data) setBatchDetail(detail.data as AnnualTaxBatchDetail);
                    }
                }
            })();
        });
    };

    const handleCreateBatch = (event: React.FormEvent) => {
        event.preventDefault();
        if (!selectedClientId) {
            toast.error("Pilih klien terlebih dahulu.");
            return;
        }

        startTransition(() => {
            void (async () => {
                const response = await createAnnualTaxBatch(selectedClientId, Number(taxYear));
                if (!response.success) {
                    toast.error(response.error || "Gagal membuat batch SPT Tahunan.");
                    return;
                }

                const created = response.data as { id: string };
                setActiveBatchId(created.id);
                toast.success("Batch SPT Tahunan dibuat.");
                refreshCurrentClient(created.id);
            })();
        });
    };

    const handleUpload = (event: React.FormEvent) => {
        event.preventDefault();
        if (!activeBatchId) {
            toast.error("Buat atau pilih batch terlebih dahulu.");
            return;
        }
        const file = fileInputRef.current?.files?.[0];
        if (!file) {
            toast.error("Pilih file Excel terlebih dahulu.");
            return;
        }

        const formData = new FormData();
        formData.append("file", file);

        startTransition(() => {
            void (async () => {
                const response = await classifyAnnualTaxWorkbookUpload(activeBatchId, formData);
                if (response.success) {
                    toast.success("Workbook berhasil diklasifikasikan.");
                    if (fileInputRef.current) fileInputRef.current.value = "";
                    const detail = await getAnnualTaxBatchDetail(activeBatchId);
                    if (detail.success && detail.data) setBatchDetail(detail.data as AnnualTaxBatchDetail);
                    refreshCurrentClient(activeBatchId);
                } else {
                    toast.error(response.error || "Gagal membaca workbook.");
                }
            })();
        });
    };

    if (!selectedClientId) {
        return (
            <div className="rounded-[16px] border border-dashed border-border bg-muted/20 p-12 text-center">
                <BookOpenCheck className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
                <h2 className="text-lg font-semibold text-foreground">Pilih klien untuk mulai SPT Tahunan.</h2>
                <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
                    Modul ini menyimpan packet tahunan per sub-account agar workbook, mapping, review, dan export tidak tercampur antar badan usaha.
                </p>
            </div>
        );
    }

    const openIssues = batchDetail?.issues.filter((issue) => issue.status === "Open") ?? [];
    const mappedSections = batchDetail?.sections.filter((section) => section.status !== "Missing").length ?? 0;

    return (
        <div className="space-y-6">
            <section className="rounded-[16px] border border-border bg-card p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <div className="mb-3 inline-flex items-center gap-2 rounded-[8px] border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
                            <BookOpenCheck className="h-3.5 w-3.5" />
                            Annual Corporate Tax Pack
                        </div>
                        <h2 className="font-serif text-2xl text-foreground">SPT Tahunan Badan Workspace</h2>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                            Upload the annual Excel pack for {selectedClient?.nama}. The system classifies SPT 1771 forms, fiscal reconciliation, VAT, tax recaps, depreciation, AR/AP, payroll, and supporting schedules.
                        </p>
                    </div>
                    <Badge variant={batchDetail ? statusVariant[batchDetail.status] : "default"}>
                        {batchDetail?.status ?? "No batch selected"}
                    </Badge>
                </div>
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
                <div className="space-y-6">
                    <div className="rounded-[16px] border border-border bg-card p-5">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <Plus className="h-4 w-4 text-accent" />
                            Create tax year batch
                        </h3>
                        <form onSubmit={handleCreateBatch} className="mt-4 space-y-3">
                            <Input
                                label="Tahun pajak"
                                type="number"
                                min={2000}
                                max={2100}
                                value={taxYear}
                                onChange={(event) => setTaxYear(event.target.value)}
                            />
                            <Button type="submit" variant="accent" className="w-full gap-2" disabled={isPending}>
                                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                Create / open batch
                            </Button>
                        </form>
                    </div>

                    <div className="rounded-[16px] border border-border bg-card p-5">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <Layers3 className="h-4 w-4 text-accent" />
                            Existing batches
                        </h3>
                        <div className="mt-4 space-y-2">
                            {batches.length === 0 ? (
                                <p className="rounded-[10px] bg-surface p-4 text-sm text-muted-foreground">No annual tax batches yet.</p>
                            ) : (
                                batches.map((batch) => (
                                    <button
                                        key={batch.id}
                                        type="button"
                                        onClick={() => setActiveBatchId(batch.id)}
                                        className={`w-full rounded-[10px] border p-3 text-left transition-colors ${
                                            activeBatchId === batch.id ? "border-accent bg-accent/5" : "border-border hover:bg-surface"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="font-medium text-foreground">SPT {batch.taxYear}</span>
                                            <Badge variant={statusVariant[batch.status]}>{batch.status}</Badge>
                                        </div>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {batch._count.workbooks} workbook, {batch._count.issues} open issues
                                        </p>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                        <div className="rounded-[14px] border border-border bg-card p-4">
                            <p className="text-xs font-medium text-muted-foreground">Workbooks</p>
                            <p className="mt-2 text-2xl font-semibold text-foreground">{batchDetail?.workbooks.length ?? 0}</p>
                        </div>
                        <div className="rounded-[14px] border border-border bg-card p-4">
                            <p className="text-xs font-medium text-muted-foreground">Detected sheets</p>
                            <p className="mt-2 text-2xl font-semibold text-foreground">
                                {batchDetail?.workbooks.reduce((sum, workbook) => sum + workbook.sheets.length, 0) ?? 0}
                            </p>
                        </div>
                        <div className="rounded-[14px] border border-border bg-card p-4">
                            <p className="text-xs font-medium text-muted-foreground">Mapped sections</p>
                            <p className="mt-2 text-2xl font-semibold text-foreground">{mappedSections}</p>
                        </div>
                        <div className="rounded-[14px] border border-border bg-card p-4">
                            <p className="text-xs font-medium text-muted-foreground">Open issues</p>
                            <p className={`mt-2 text-2xl font-semibold ${openIssues.length > 0 ? "text-warning" : "text-success"}`}>{openIssues.length}</p>
                        </div>
                    </div>

                    <div className="rounded-[16px] border border-border bg-card p-5">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <UploadCloud className="h-4 w-4 text-accent" />
                            Upload and classify annual workbook
                        </h3>
                        <form onSubmit={handleUpload} className="mt-4 flex flex-col gap-3 sm:flex-row">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls"
                                className="flex h-10 flex-1 rounded-[8px] border border-border bg-card px-3 py-2 text-sm text-foreground"
                            />
                            <Button type="submit" variant="dark" className="gap-2" disabled={isPending || !activeBatchId}>
                                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                                Classify workbook
                            </Button>
                        </form>
                        <p className="mt-3 text-xs text-muted-foreground">
                            Phase 1 stores workbook metadata and sheet classification. Extraction and validation will build on this evidence layer.
                        </p>
                    </div>

                    <div className="rounded-[16px] border border-border bg-card">
                        <div className="border-b border-border p-5">
                            <h3 className="text-lg font-semibold text-foreground">Workbook sheets</h3>
                            <p className="mt-1 text-sm text-muted-foreground">Detected sheet types from uploaded SPT workbooks.</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px] text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-surface">
                                        <th className="px-4 py-3 text-left text-[11px] font-medium uppercase text-muted-foreground">Workbook</th>
                                        <th className="px-4 py-3 text-left text-[11px] font-medium uppercase text-muted-foreground">Sheet</th>
                                        <th className="px-4 py-3 text-left text-[11px] font-medium uppercase text-muted-foreground">Type</th>
                                        <th className="px-4 py-3 text-right text-[11px] font-medium uppercase text-muted-foreground">Confidence</th>
                                        <th className="px-4 py-3 text-right text-[11px] font-medium uppercase text-muted-foreground">Cells</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {!batchDetail || batchDetail.workbooks.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                                                Upload an annual workbook to see classified sheets.
                                            </td>
                                        </tr>
                                    ) : (
                                        batchDetail.workbooks.flatMap((workbook) =>
                                            workbook.sheets.map((sheet) => (
                                                <tr key={sheet.id} className="hover:bg-surface/60">
                                                    <td className="px-4 py-3 text-muted-foreground">{workbook.fileName}</td>
                                                    <td className="px-4 py-3 font-medium text-foreground">{sheet.sheetName}</td>
                                                    <td className="px-4 py-3">
                                                        <Badge variant={sheet.detectedType === "Unknown" ? "warning" : "info"}>{sheet.detectedType}</Badge>
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-muted-foreground">{Math.round(sheet.confidence * 100)}%</td>
                                                    <td className="px-4 py-3 text-right text-muted-foreground">{sheet.cellCount}</td>
                                                </tr>
                                            )),
                                        )
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <div className="rounded-[16px] border border-border bg-card p-5">
                    <h3 className="text-lg font-semibold text-foreground">Review sections</h3>
                    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {(batchDetail?.sections ?? []).map((section) => (
                            <div key={section.id} className="flex items-center justify-between gap-3 rounded-[10px] border border-border bg-surface p-3">
                                <span className="text-sm text-foreground">{section.title}</span>
                                <Badge variant={section.status === "Missing" ? "default" : "info"}>{section.status}</Badge>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-[16px] border border-border bg-card p-5">
                    <h3 className="text-lg font-semibold text-foreground">Validation issues</h3>
                    <div className="mt-4 space-y-2">
                        {openIssues.length === 0 ? (
                            <div className="flex items-center gap-2 rounded-[10px] bg-surface p-4 text-sm text-success">
                                <CheckCircle2 className="h-4 w-4" />
                                No open issues for this batch.
                            </div>
                        ) : (
                            openIssues.map((issue) => (
                                <div key={issue.id} className="rounded-[10px] border border-warning-border bg-warning-bg p-3">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="mt-0.5 h-4 w-4 text-warning" />
                                        <div>
                                            <p className="text-sm font-medium text-foreground">{issue.code}</p>
                                            <p className="mt-1 text-xs text-muted-foreground">{issue.message}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}
