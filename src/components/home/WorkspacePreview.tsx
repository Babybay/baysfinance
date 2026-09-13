"use client";

import { useState } from "react";
import { ArrowUpRight, Check, FileText, CalendarDays, FolderOpen, ChevronRight, Layers3 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import Link from "next/link";

export function WorkspacePreview() {
    const { locale } = useI18n();
    const id = locale === "id";
    const [active, setActive] = useState(0);
    const tabs = id ? ["Ringkasan", "Dokumen", "Perizinan"] : ["Overview", "Documents", "Permits"];
    const content = [
        { heading: id ? "Semua tertata. Bisnis terarah." : "Everything in order. A clearer way forward.", items: id ? ["Dokumen dalam satu tempat", "Pantau tenggat pajak", "Ikuti progres layanan"] : ["Documents in one place", "Keep tax deadlines in view", "Follow your service progress"] },
        { heading: id ? "Dokumen rapi, mudah ditemukan." : "Less searching. More clarity.", items: id ? ["Unggah dokumen pendukung", "Akses berkas yang dibagikan", "Koordinasi dengan konsultan"] : ["Upload supporting documents", "Access your shared files", "Coordinate with your consultant"] },
        { heading: id ? "Lihat langkah berikutnya." : "Know what comes next.", items: id ? ["Lihat persyaratan perizinan", "Lengkapi dokumen pengajuan", "Pantau status permohonan"] : ["Review permit requirements", "Prepare application documents", "Track application status"] },
    ];
    const current = content[active];

    return (
        <div className="cal-preview-scene">
            <div className="cal-orbit cal-orbit-one" aria-hidden="true" />
            <div className="cal-orbit cal-orbit-two" aria-hidden="true" />
            <div className="cal-preview-caption"><span className="h-1.5 w-1.5 rounded-full bg-[#ffdbbb]" />{id ? "RUANG UNTUK BISNIS ANDA" : "A LITTLE SPACE FOR BIG PLANS"}</div>
            <div className="cal-workspace">
                <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
                    <div className="flex items-center gap-2.5"><Layers3 className="h-5 w-5 text-accent" /><span className="text-sm font-semibold">{id ? "Portal Klien CAL" : "CAL Client Portal"}</span></div>
                    <span className="rounded-full bg-surface px-2.5 py-1 text-[10px] font-medium text-muted">{id ? "Pratinjau" : "Preview"}</span>
                </div>
                <div className="flex gap-5 border-b border-border px-5 sm:px-6" role="tablist" aria-label={id ? "Pratinjau ruang kerja" : "Workspace preview"}>
                    {tabs.map((tab, index) => <button key={tab} type="button" role="tab" id={`preview-tab-${index}`} aria-selected={active === index} aria-controls="preview-panel" tabIndex={active === index ? 0 : -1} onClick={() => setActive(index)} onKeyDown={(event) => {
                        if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
                        event.preventDefault();
                        const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
                        setActive(next);
                        document.getElementById(`preview-tab-${next}`)?.focus();
                    }} className={`border-b-2 py-3 text-xs font-medium transition-colors ${active === index ? "border-accent text-accent" : "border-transparent text-muted hover:text-foreground"}`}>{tab}</button>)}
                </div>
                <div className="p-5 sm:p-6" id="preview-panel" role="tabpanel" aria-labelledby={`preview-tab-${active}`} tabIndex={0}>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">{id ? "Bisnis Anda, lebih terorganisir" : "Your business, more connected"}</p>
                    <h2 className="max-w-[270px] font-serif text-[27px] leading-[1.15]">{current.heading}</h2>
                    <div className="my-5 grid grid-cols-3 gap-2">
                        {[{ Icon: FileText, text: id ? "Akuntansi" : "Accounting" }, { Icon: CalendarDays, text: id ? "Perpajakan" : "Tax" }, { Icon: FolderOpen, text: id ? "Legalitas" : "Legal" }].map(({ Icon, text }) => <div key={text} className="rounded-xl border border-border bg-surface/60 px-2 py-3"><Icon className="mb-3 h-4 w-4 text-accent" /><span className="text-[10px] font-medium sm:text-xs">{text}</span></div>)}
                    </div>
                    <div className="space-y-3.5">{current.items.map(item => <div key={item} className="flex items-center gap-2.5 text-xs text-muted"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-muted text-accent"><Check className="h-3 w-3" /></span>{item}</div>)}</div>
                    <Link href="/portal" className="mt-6 flex items-center justify-between border-t border-border pt-4 text-xs font-semibold text-accent">{id ? "Jelajahi portal klien" : "Explore the client portal"}<ChevronRight className="h-4 w-4" /></Link>
                </div>
            </div>
            <div className="cal-preview-note"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ffe6d4] text-[#99401f]"><ArrowUpRight className="h-5 w-5" /></span><div><p className="text-sm font-semibold">{id ? "Fokus pada langkah berikutnya." : "Make room for what’s next."}</p><p className="mt-1 text-xs text-[#7a6b60]">{id ? "Kami bantu urus detailnya." : "We’ll help with the details."}</p></div></div>
            <span className="cal-preview-footnote">{id ? "Ilustrasi fitur portal CAL" : "An illustration of the CAL portal"}</span>
        </div>
    );
}
