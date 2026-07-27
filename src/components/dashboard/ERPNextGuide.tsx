"use client";

import Link from "next/link";
import {
    ArrowRight,
    BookOpen,
    CheckCircle2,
    CircleAlert,
    ClipboardCheck,
    ExternalLink,
    Landmark,
    ShieldCheck,
    Users,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n";
import { getStaffDeskUrl, getStaffPortalUrl } from "@/lib/staff-guide";

const staffPortalUrl = getStaffPortalUrl();

type GuideContent = {
    eyebrow: string;
    title: string;
    subtitle: string;
    openPortal: string;
    policyTitle: string;
    policyIntro: string;
    policyRows: { system: string; owner: string; description: string }[];
    onboardingTitle: string;
    onboardingSubtitle: string;
    onboardingSteps: { title: string; description: string }[];
    workflowsTitle: string;
    workflows: { title: string; description: string; action: string; route: string }[];
    casesTitle: string;
    cases: { title: string; scenario: string; steps: string[]; outcome: string }[];
    guardrailsTitle: string;
    guardrails: string[];
};

const guideContent: Record<"en" | "id", GuideContent> = {
    en: {
        eyebrow: "Staff onboarding · ERPNext",
        title: "Your first week with ERPNext",
        subtitle: "Use this guide to understand where staff work happens, practise the core workflows, and know when Bay'sConsult remains the system of record.",
        openPortal: "Open ERPNext Staff Portal",
        policyTitle: "Know which system owns the work",
        policyIntro: "Do not duplicate records between systems. Use the owner below and escalate a sync issue rather than editing both copies.",
        policyRows: [
            { system: "ERPNext", owner: "Staff operations", description: "Accounts, Journal Entries, staff tasks, internal approvals, and the staff workspace." },
            { system: "Bay'sConsult", owner: "Client operations", description: "Client portal records, tax calendar, permit cases, client documents, invoices, and payments while the current sync is active." },
        ],
        onboardingTitle: "First-day checklist",
        onboardingSubtitle: "Complete these in order before processing client work.",
        onboardingSteps: [
            { title: "Sign in and set your profile", description: "Open the Staff Portal, confirm your name, email, timezone, and company. Use only your individual Frappe account." },
            { title: "Learn the Desk", description: "Open the Guide workspace, My ToDos, and the search bar. Pin the modules you use every day." },
            { title: "Check your permissions", description: "Try opening Customers, Projects, Accounts, and Journal Entries. Request access through your manager—never use another staff member's account." },
            { title: "Complete the sample workflow", description: "Use a training customer or a draft document to practise before changing a live record." },
        ],
        workflowsTitle: "Core staff workflows",
        workflows: [
            { title: "Start the day", description: "Review My ToDos, overdue tasks, and assignments. Confirm the company before opening any financial document.", action: "Open ERPNext ToDos", route: "todo" },
            { title: "Work a client request", description: "Search the client first. Add an internal note or task, assign an owner, and keep the work status current.", action: "Open Customers", route: "customer" },
            { title: "Record finance work", description: "Use draft documents for review. Validate the company, posting date, account, tax, and attachments before submitting.", action: "Open Accounting", route: "accounting" },
            { title: "Close the loop", description: "Mark the task complete, leave a concise internal handover, and flag any sync or data-ownership issue to the operations lead.", action: "Open Projects", route: "project" },
        ],
        casesTitle: "Practice case studies",
        cases: [
            {
                title: "Case 1 — New advisory client",
                scenario: "A consultant receives a request from PT Nusantara for monthly tax advisory.",
                steps: ["Search for the customer first to avoid duplicates.", "Create or update the Customer only after the approved client intake is complete.", "Create a Project and assign the engagement owner with the next action as a ToDo.", "Keep tax deadlines and permit case work in Bay'sConsult until the ownership migration is announced."],
                outcome: "One accountable owner, a visible task trail, and no duplicate client record.",
            },
            {
                title: "Case 2 — Consulting invoice to payment",
                scenario: "A monthly advisory service is ready to bill and the client pays three days later.",
                steps: ["Confirm whether the invoice is still Bay'sConsult-owned under the current sync policy.", "When ERPNext owns the process, prepare a Draft Sales Invoice and have the designated reviewer validate it.", "Submit only after the reviewer confirms customer, company, tax, and amount.", "Record the payment against the correct submitted invoice and attach the approved payment evidence."],
                outcome: "A complete audit trail from invoice through payment, without posting a duplicate invoice.",
            },
            {
                title: "Case 3 — Month-end journal correction",
                scenario: "A bank charge was booked to the wrong expense account during month-end review.",
                steps: ["Check the original submitted entry and supporting document.", "Do not edit a submitted entry directly; follow the approved correction or cancellation process.", "Prepare a balanced Draft Journal Entry with a clear reference to the original.", "Get approval, submit the correction, and update the related task with the final voucher number."],
                outcome: "The correction is traceable, balanced, and approved before it affects the ledger.",
            },
        ],
        guardrailsTitle: "Operating guardrails",
        guardrails: [
            "Never share passwords, API keys, or session links. Use your own Frappe account.",
            "Search before creating. Duplicate Customers, Items, and invoices create reconciliation work.",
            "Draft first; submit only after required review and supporting documents are complete.",
            "If ERPNext and Bay'sConsult disagree, stop and report the sync issue—do not edit both systems to force a match.",
        ],
    },
    id: {
        eyebrow: "Onboarding staf · ERPNext",
        title: "Minggu pertama Anda dengan ERPNext",
        subtitle: "Gunakan panduan ini untuk memahami lokasi kerja staf, melatih alur kerja inti, dan mengetahui kapan Bay'sConsult tetap menjadi sumber data utama.",
        openPortal: "Buka Portal Staf ERPNext",
        policyTitle: "Pahami sistem pemilik pekerjaan",
        policyIntro: "Jangan menggandakan data di dua sistem. Gunakan sistem pemilik di bawah ini dan laporkan masalah sinkronisasi, bukan mengubah kedua data sekaligus.",
        policyRows: [
            { system: "ERPNext", owner: "Operasional staf", description: "Akun, Jurnal, tugas staf, persetujuan internal, dan workspace staf." },
            { system: "Bay'sConsult", owner: "Operasional klien", description: "Data portal klien, kalender pajak, kasus perizinan, dokumen klien, invoice, dan pembayaran selama sinkronisasi saat ini aktif." },
        ],
        onboardingTitle: "Checklist hari pertama",
        onboardingSubtitle: "Selesaikan secara berurutan sebelum memproses pekerjaan klien.",
        onboardingSteps: [
            { title: "Masuk dan atur profil", description: "Buka Portal Staf, pastikan nama, email, zona waktu, dan perusahaan Anda benar. Gunakan hanya akun Frappe pribadi Anda." },
            { title: "Pelajari Desk", description: "Buka workspace Guide, My ToDos, dan kolom pencarian. Pin modul yang digunakan setiap hari." },
            { title: "Periksa akses", description: "Coba buka Customers, Projects, Accounts, dan Journal Entries. Minta akses kepada manajer—jangan memakai akun staf lain." },
            { title: "Selesaikan alur contoh", description: "Gunakan customer training atau dokumen draft untuk latihan sebelum mengubah data yang aktif." },
        ],
        workflowsTitle: "Alur kerja inti staf",
        workflows: [
            { title: "Mulai hari kerja", description: "Periksa My ToDos, tugas terlambat, dan assignment. Pastikan company sebelum membuka dokumen keuangan apa pun.", action: "Buka ERPNext ToDos", route: "todo" },
            { title: "Proses permintaan klien", description: "Cari klien terlebih dahulu. Tambahkan catatan internal atau task, tetapkan pemilik, dan perbarui status pekerjaan.", action: "Buka Customers", route: "customer" },
            { title: "Catat pekerjaan keuangan", description: "Gunakan dokumen draft untuk review. Validasi company, tanggal posting, akun, pajak, dan lampiran sebelum submit.", action: "Buka Accounting", route: "accounting" },
            { title: "Tutup pekerjaan", description: "Tandai task selesai, tulis handover internal yang singkat, dan laporkan masalah sinkronisasi atau kepemilikan data ke operations lead.", action: "Buka Projects", route: "project" },
        ],
        casesTitle: "Studi kasus latihan",
        cases: [
            {
                title: "Kasus 1 — Klien advisory baru",
                scenario: "Seorang konsultan menerima permintaan advisory pajak bulanan dari PT Nusantara.",
                steps: ["Cari customer terlebih dahulu untuk menghindari duplikasi.", "Buat atau perbarui Customer hanya setelah intake klien disetujui.", "Buat Project dan tetapkan engagement owner dengan aksi berikutnya sebagai ToDo.", "Simpan pekerjaan deadline pajak dan kasus perizinan di Bay'sConsult sampai migrasi kepemilikan diumumkan."],
                outcome: "Satu pemilik yang bertanggung jawab, jejak tugas yang terlihat, dan tidak ada data klien ganda.",
            },
            {
                title: "Kasus 2 — Invoice konsultasi sampai pembayaran",
                scenario: "Layanan advisory bulanan siap ditagihkan dan klien membayar tiga hari kemudian.",
                steps: ["Pastikan invoice masih dimiliki Bay'sConsult berdasarkan kebijakan sinkronisasi saat ini.", "Saat ERPNext menjadi pemilik proses, siapkan Draft Sales Invoice dan minta reviewer yang ditunjuk memvalidasinya.", "Submit hanya setelah reviewer mengonfirmasi customer, company, pajak, dan nominal.", "Catat pembayaran pada invoice submitted yang tepat dan lampirkan bukti pembayaran yang disetujui."],
                outcome: "Jejak audit lengkap dari invoice hingga pembayaran tanpa membuat invoice ganda.",
            },
            {
                title: "Kasus 3 — Koreksi jurnal akhir bulan",
                scenario: "Biaya bank tercatat ke akun beban yang salah saat review akhir bulan.",
                steps: ["Periksa jurnal submitted asli dan dokumen pendukung.", "Jangan mengubah jurnal submitted secara langsung; ikuti proses koreksi atau pembatalan yang disetujui.", "Siapkan Draft Journal Entry yang seimbang dan merujuk jurnal asli dengan jelas.", "Dapatkan persetujuan, submit koreksi, lalu perbarui task terkait dengan nomor voucher akhir."],
                outcome: "Koreksi terlacak, seimbang, dan disetujui sebelum memengaruhi buku besar.",
            },
        ],
        guardrailsTitle: "Aturan operasional",
        guardrails: [
            "Jangan pernah membagikan password, API key, atau session link. Gunakan akun Frappe Anda sendiri.",
            "Cari sebelum membuat. Customer, Item, dan invoice ganda menambah pekerjaan rekonsiliasi.",
            "Buat draft terlebih dahulu; submit hanya setelah review dan dokumen pendukung lengkap.",
            "Jika ERPNext dan Bay'sConsult tidak sesuai, berhenti dan laporkan masalah sinkronisasi—jangan mengubah keduanya agar terlihat cocok.",
        ],
    },
};

const workflowIcons = [ClipboardCheck, Users, Landmark, CheckCircle2];

export function ERPNextGuide() {
    const { locale } = useI18n();
    const content = guideContent[locale];

    return (
        <div className="max-w-6xl mx-auto pb-8">
            <section className="rounded-[20px] border border-border bg-card p-6 lg:p-8 mb-6">
                <Badge variant="warning" className="w-fit mb-4">{content.eyebrow}</Badge>
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-3xl">
                        <h1 className="font-serif text-3xl lg:text-4xl text-foreground">{content.title}</h1>
                        <p className="text-muted-foreground mt-3 leading-6">{content.subtitle}</p>
                    </div>
                    <a
                        href={staffPortalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={buttonVariants({ variant: "accent", className: "gap-2 w-full lg:w-auto" })}
                    >
                        {content.openPortal}<ExternalLink className="h-4 w-4" />
                    </a>
                </div>
            </section>

            <section className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck className="h-5 w-5 text-accent" />
                    <h2 className="font-serif text-xl text-foreground">{content.policyTitle}</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{content.policyIntro}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {content.policyRows.map((row) => (
                        <div key={row.system} className="rounded-[16px] border border-border bg-card p-5">
                            <div className="flex items-center justify-between gap-3 mb-3">
                                <h3 className="font-semibold text-foreground">{row.system}</h3>
                                <Badge variant={row.system === "ERPNext" ? "warning" : "info"}>{row.owner}</Badge>
                            </div>
                            <p className="text-sm leading-6 text-muted-foreground">{row.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="mb-6 rounded-[16px] border border-border bg-card p-6">
                <div className="flex items-center gap-2 mb-1">
                    <BookOpen className="h-5 w-5 text-accent" />
                    <h2 className="font-serif text-xl text-foreground">{content.onboardingTitle}</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-5">{content.onboardingSubtitle}</p>
                <ol className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {content.onboardingSteps.map((step, index) => (
                        <li key={step.title} className="flex gap-4 rounded-[12px] bg-surface p-4">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">{index + 1}</span>
                            <div>
                                <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                                <p className="text-sm text-muted-foreground leading-6 mt-1">{step.description}</p>
                            </div>
                        </li>
                    ))}
                </ol>
            </section>

            <section className="mb-6">
                <h2 className="font-serif text-xl text-foreground mb-4">{content.workflowsTitle}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {content.workflows.map((workflow, index) => {
                        const Icon = workflowIcons[index];
                        return (
                            <div key={workflow.title} className="rounded-[16px] border border-border bg-card p-5">
                                <Icon className="h-5 w-5 text-accent mb-3" />
                                <h3 className="font-semibold text-foreground">{workflow.title}</h3>
                                <p className="text-sm leading-6 text-muted-foreground mt-2">{workflow.description}</p>
                                <a href={getStaffDeskUrl(workflow.route)} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
                                    {workflow.action}<ArrowRight className="h-4 w-4" />
                                </a>
                            </div>
                        );
                    })}
                </div>
            </section>

            <section className="mb-6">
                <h2 className="font-serif text-xl text-foreground mb-4">{content.casesTitle}</h2>
                <div className="space-y-4">
                    {content.cases.map((caseStudy) => (
                        <article key={caseStudy.title} className="rounded-[16px] border border-border bg-card p-6">
                            <h3 className="font-semibold text-foreground">{caseStudy.title}</h3>
                            <p className="text-sm text-muted-foreground leading-6 mt-2">{caseStudy.scenario}</p>
                            <ol className="mt-4 space-y-2">
                                {caseStudy.steps.map((step, index) => (
                                    <li key={step} className="flex gap-3 text-sm text-muted-foreground leading-6">
                                        <span className="font-semibold text-accent">{index + 1}.</span>{step}
                                    </li>
                                ))}
                            </ol>
                            <div className="mt-4 flex gap-2 rounded-[10px] bg-accent-muted p-3 text-sm text-foreground">
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-accent mt-0.5" />
                                <span>{caseStudy.outcome}</span>
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            <section className="rounded-[16px] border border-warning-border bg-warning-bg p-6">
                <div className="flex items-center gap-2 mb-4">
                    <CircleAlert className="h-5 w-5 text-warning" />
                    <h2 className="font-serif text-xl text-foreground">{content.guardrailsTitle}</h2>
                </div>
                <ul className="space-y-3">
                    {content.guardrails.map((guardrail) => (
                        <li key={guardrail} className="flex gap-3 text-sm leading-6 text-foreground">
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-accent mt-1" />{guardrail}
                        </li>
                    ))}
                </ul>
                <div className="mt-5">
                    <Link href="/dashboard" className={buttonVariants({ variant: "soft", className: "gap-2" })}>
                        {locale === "id" ? "Kembali ke dashboard" : "Back to dashboard"}<ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </section>
        </div>
    );
}
