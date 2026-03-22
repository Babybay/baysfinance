"use client";

import React from "react";
import Link from "next/link";
import { FileSpreadsheet } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { OcrScanner } from "@/components/dashboard/OcrScanner";
import type { Client } from "@/lib/data";

interface ScanPageViewProps {
    clients: Client[];
    defaultClientId: string;
}

export function ScanPageView({ clients, defaultClientId }: ScanPageViewProps) {
    const { locale } = useI18n();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-serif text-2xl text-foreground">
                        {locale === "id" ? "Scan Dokumen" : "Document Scanner"}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {locale === "id"
                            ? "Scan foto dokumen keuangan dan ekstrak data secara otomatis menggunakan OCR"
                            : "Scan photos of financial documents and extract data automatically using OCR"}
                    </p>
                </div>
                <Link
                    href="/dashboard/accounting/import"
                    className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
                >
                    <FileSpreadsheet className="h-4 w-4" />
                    Import Spreadsheet
                </Link>
            </div>

            {/* Tips */}
            <div className="rounded-lg border border-accent/20 bg-accent/5 p-4">
                <h3 className="text-sm font-medium text-foreground mb-2">
                    {locale === "id" ? "Tips untuk hasil scan terbaik:" : "Tips for best scan results:"}
                </h3>
                <ul className="grid grid-cols-1 gap-1.5 text-xs text-muted-foreground sm:grid-cols-2">
                    <li className="flex items-start gap-2">
                        <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                        {locale === "id" ? "Upload gambar (JPG, PNG) atau file PDF" : "Upload images (JPG, PNG) or PDF files"}
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                        {locale === "id" ? "PDF digital langsung diekstrak teksnya (cepat & akurat)" : "Digital PDFs are directly text-extracted (fast & accurate)"}
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                        {locale === "id" ? "Foto: pastikan cahaya cukup, dokumen lurus & tidak blur" : "Photos: ensure good lighting, straight & not blurry"}
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                        {locale === "id" ? "Resolusi minimal 300 DPI untuk teks kecil" : "Use at least 300 DPI for small text"}
                    </li>
                </ul>
            </div>

            {/* Scanner with journal import capability */}
            <OcrScanner clients={clients} defaultClientId={defaultClientId} />
        </div>
    );
}
