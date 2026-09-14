"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Calculator, Check, CheckCircle2, ChevronRight, CircleAlert, ExternalLink, RotateCcw, Users } from "lucide-react";
import { buttonVariants } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n";
import { getStaffDeskUrl, getStaffPortalUrl } from "@/lib/staff-guide";

type Track = "general" | "accounting";
type Locale = "en" | "id";
type TrainingModule = { id: string; title: string; time: string; outcome: string; steps: string[]; action: string; route?: string; warning?: string };

const copy = {
    en: {
        eyebrow: "Staff starter guide", title: "Learn one task at a time.",
        subtitle: "Choose your job, follow each screen with a supervisor, and do not use live client data while practising.",
        choose: "What work will you do?", general: "General staff", generalHelp: "Clients, tasks and service follow-up",
        accounting: "Accounting staff", accountingHelp: "Drafts, journals and reconciliation", progress: "modules complete",
        module: "Module", result: "After this module you can", steps: "Do these steps", complete: "I completed this with my supervisor",
        completed: "Completed", reset: "Reset my progress", helpTitle: "Stop when you are unsure",
        help: "Do not guess and do not use another person's account. Tell your supervisor the page name, client name and exact error. Never send a password or an unredacted client document in chat.",
        advanced: "Open the detailed operating reference", openPortal: "Open ERPNext staff portal",
        finishTitle: "Starter training complete", finish: "Ask your supervisor to verify your permissions before you work on live records.",
    },
    id: {
        eyebrow: "Panduan awal staf", title: "Belajar satu tugas pada satu waktu.",
        subtitle: "Pilih jenis pekerjaan, ikuti setiap layar bersama pembimbing, dan jangan memakai data klien aktif saat latihan.",
        choose: "Pekerjaan apa yang akan Anda lakukan?", general: "Staf umum", generalHelp: "Klien, tugas, dan tindak lanjut layanan",
        accounting: "Staf akuntansi", accountingHelp: "Draft, jurnal, dan rekonsiliasi", progress: "modul selesai",
        module: "Modul", result: "Setelah modul ini Anda dapat", steps: "Lakukan langkah berikut", complete: "Saya sudah menyelesaikan ini bersama pembimbing",
        completed: "Selesai", reset: "Ulangi progres saya", helpTitle: "Berhenti jika Anda ragu",
        help: "Jangan menebak dan jangan memakai akun orang lain. Beri tahu pembimbing nama halaman, nama klien, dan pesan error yang tepat. Jangan kirim password atau dokumen klien tanpa sensor melalui chat.",
        advanced: "Buka referensi operasional lengkap", openPortal: "Buka portal staf ERPNext",
        finishTitle: "Pelatihan awal selesai", finish: "Minta pembimbing memeriksa izin akses Anda sebelum bekerja pada data aktif.",
    },
} as const;

export function getTrainingModules(locale: Locale, track: Track): TrainingModule[] {
    const id = locale === "id";
    const common: TrainingModule[] = [
        {
            id: "login", title: id ? "Masuk dan kenali layar" : "Sign in and recognise the screen", time: "5 min",
            outcome: id ? "masuk dengan akun sendiri dan memastikan profil serta Company sudah benar." : "sign in with your own account and confirm your profile and Company.",
            steps: id ? ["Buka Portal Staf ERPNext di tombol bawah.", "Masuk memakai email kerja Anda sendiri.", "Periksa nama, zona waktu, dan Company bersama pembimbing."] : ["Open the ERPNext Staff Portal below.", "Sign in with your own work email.", "Check your name, timezone and Company with your supervisor."],
            action: id ? "Buka portal staf" : "Open staff portal",
            warning: id ? "Jangan simpan password di catatan atau memakai akun staf lain." : "Never save a password in notes or use another staff member's account.",
        },
        {
            id: "todos", title: id ? "Mulai hari dari My ToDos" : "Start the day from My ToDos", time: "7 min",
            outcome: id ? "melihat pekerjaan hari ini dan memilih tugas yang benar." : "see today's work and choose the correct task.",
            steps: id ? ["Buka My ToDos.", "Cari tugas terlambat dan tugas atas nama Anda.", "Buka satu tugas latihan dan sebutkan klien, tenggat, serta tindakan berikutnya kepada pembimbing."] : ["Open My ToDos.", "Find overdue tasks and tasks assigned to you.", "Open one training task and tell your supervisor the client, due date and next action."],
            action: id ? "Buka My ToDos" : "Open My ToDos", route: "todo",
        },
        {
            id: "customer", title: id ? "Cari klien tanpa membuat duplikat" : "Find a client without creating a duplicate", time: "8 min",
            outcome: id ? "menemukan Customer yang benar sebelum membuat catatan atau tugas." : "find the correct Customer before adding notes or tasks.",
            steps: id ? ["Buka Customers dan gunakan pencarian.", "Cocokkan nama legal, email PIC, dan Company.", "Jika ada dua hasil mirip, berhenti dan minta pembimbing memilih. Jangan membuat Customer baru."] : ["Open Customers and use search.", "Match the legal name, contact email and Company.", "If two results look similar, stop and ask your supervisor. Do not create another Customer."],
            action: id ? "Buka Customers" : "Open Customers", route: "customer",
        },
        {
            id: "practice", title: id ? "Latihan aman sebelum data aktif" : "Practise before touching live data", time: "8 min",
            outcome: id ? "membuka data latihan, membuat satu ToDo, lalu menutupnya dengan catatan singkat." : "use training data, create one ToDo and close it with a short note.",
            steps: id ? ["Minta pembimbing menunjukkan Customer latihan.", "Buat ToDo latihan dengan pemilik, tenggat, dan tindakan berikutnya.", "Tandai selesai dan tulis hasilnya dalam satu kalimat."] : ["Ask your supervisor to show you the training Customer.", "Create a practice ToDo with an owner, due date and next action.", "Mark it complete and record the result in one sentence."],
            action: id ? "Buka Projects" : "Open Projects", route: "project",
            warning: id ? "Jangan menekan Submit pada dokumen keuangan saat latihan." : "Never press Submit on a financial document during practice.",
        },
    ];
    const roleModules: Record<Track, TrainingModule[]> = {
        general: [
            {
                id: "general-request", title: id ? "Proses permintaan klien" : "Handle a client request", time: "10 min",
                outcome: id ? "mencatat permintaan, menetapkan pemilik, dan menentukan tindak lanjut." : "record a request, assign an owner and set the next follow-up.",
                steps: id ? ["Cari Lead atau Customer terlebih dahulu.", "Baca riwayat sebelum menambah catatan.", "Buat tugas dengan satu pemilik dan satu tindakan berikutnya yang jelas."] : ["Search for the Lead or Customer first.", "Read the history before adding a note.", "Create a task with one owner and one clear next action."],
                action: id ? "Buka Leads" : "Open Leads", route: "lead",
            },
            {
                id: "general-handover", title: id ? "Serahkan pekerjaan dengan jelas" : "Hand work over clearly", time: "7 min",
                outcome: id ? "memberi rekan kerja konteks tanpa harus bertanya dari awal." : "give the next person enough context without starting over.",
                steps: id ? ["Tulis apa yang sudah selesai.", "Tulis dokumen atau keputusan yang masih ditunggu.", "Tetapkan pemilik dan tenggat berikutnya, lalu beri tahu pembimbing."] : ["Write what is complete.", "Write what document or decision is still missing.", "Set the next owner and due date, then tell your supervisor."],
                action: id ? "Buka Projects" : "Open Projects", route: "project",
            },
        ],
        accounting: [
            {
                id: "accounting-draft", title: id ? "Buat jurnal Draft dengan Company yang benar" : "Prepare a Draft journal for the correct Company", time: "12 min",
                outcome: id ? "memeriksa Company, tanggal, akun, debit, kredit, dan bukti sebelum review." : "check Company, date, accounts, debit, credit and evidence before review.",
                steps: id ? ["Konfirmasi Company dan periode bersama pembimbing.", "Buat Journal Entry sebagai Draft dari data latihan.", "Pastikan debit sama dengan kredit dan lampiran benar. Jangan Submit."] : ["Confirm the Company and period with your supervisor.", "Create a Draft Journal Entry using training data.", "Confirm debit equals credit and the attachment is correct. Do not Submit."],
                action: id ? "Buka Journal Entries" : "Open Journal Entries", route: "journal-entry",
                warning: id ? "Company yang salah berarti buku klien yang salah. Berhenti sebelum menyimpan." : "The wrong Company means the wrong client's books. Stop before saving.",
            },
            {
                id: "accounting-review", title: id ? "Review dan rekonsiliasi" : "Review and reconcile", time: "10 min",
                outcome: id ? "membandingkan jurnal dengan bukti dan menyerahkan Draft kepada reviewer." : "compare the journal with evidence and hand the Draft to a reviewer.",
                steps: id ? ["Cocokkan nominal, tanggal, pihak, pajak, dan akun dengan bukti.", "Catat perbedaan; jangan mengubah dua sistem agar terlihat sama.", "Kirim nomor Draft kepada reviewer. Hanya petugas berwenang yang Submit."] : ["Match amount, date, party, tax and accounts to the evidence.", "Record any mismatch; do not edit two systems to force agreement.", "Send the Draft number to the reviewer. Only an authorised person submits."],
                action: id ? "Buka General Ledger" : "Open General Ledger", route: "general-ledger",
            },
        ],
    };
    return [...common, ...roleModules[track]];
}

export function ERPNextGuide() {
    const { locale: currentLocale } = useI18n();
    const locale = currentLocale as Locale;
    const text = copy[locale];
    const [track, setTrack] = useState<Track>("general");
    const modules = useMemo(() => getTrainingModules(locale, track), [locale, track]);
    const [activeId, setActiveId] = useState(modules[0].id);
    const [completed, setCompleted] = useState<string[]>([]);

    const active = modules.find((module) => module.id === activeId) || modules[0];
    const done = completed.filter((moduleId) => modules.some((module) => module.id === moduleId));
    const progress = Math.round((done.length / modules.length) * 100);

    function finishModule() {
        const nextCompleted = completed.includes(active.id) ? completed : [...completed, active.id];
        setCompleted(nextCompleted);
        const next = modules[modules.findIndex((module) => module.id === active.id) + 1];
        if (next) setActiveId(next.id);
    }

    function resetProgress() {
        setCompleted([]);
        setActiveId(modules[0].id);
    }

    function chooseTrack(nextTrack: Track) {
        setTrack(nextTrack);
        setCompleted([]);
        setActiveId("login");
    }

    return (
        <div className="mx-auto max-w-6xl pb-10">
            <header className="rounded-[20px] bg-foreground p-6 text-background lg:p-9">
                <p className="text-sm font-semibold text-accent-muted">{text.eyebrow}</p>
                <div className="mt-3 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
                    <div className="max-w-3xl"><h1 className="text-balance font-serif text-4xl leading-tight lg:text-5xl">{text.title}</h1><p className="mt-4 max-w-2xl text-pretty leading-7 text-background/75">{text.subtitle}</p></div>
                    <a href={getStaffPortalUrl()} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "accent", className: "min-h-12 gap-2" })}>{text.openPortal}<ExternalLink className="h-4 w-4" /></a>
                </div>
            </header>

            <section aria-labelledby="choose-track" className="mt-6 rounded-[16px] bg-card p-5 lg:p-6">
                <h2 id="choose-track" className="font-serif text-2xl">{text.choose}</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {(["general", "accounting"] as const).map((option) => {
                        const selected = track === option;
                        const Icon = option === "general" ? Users : Calculator;
                        return <button key={option} type="button" aria-pressed={selected} onClick={() => chooseTrack(option)} className={`min-h-20 rounded-[12px] border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${selected ? "border-accent bg-accent-muted" : "border-border bg-surface hover:border-accent/50"}`}><span className="flex items-start gap-3"><Icon className="mt-0.5 h-5 w-5 shrink-0 text-accent" /><span><strong className="block text-foreground">{text[option]}</strong><span className="mt-1 block text-sm text-muted-foreground">{text[`${option}Help`]}</span></span></span></button>;
                    })}
                </div>
            </section>

            <div className="mt-6 grid gap-6 lg:grid-cols-[19rem_1fr] lg:items-start">
                <aside className="rounded-[16px] bg-card p-4 lg:sticky lg:top-4">
                    <div className="flex items-center justify-between gap-4 px-2 pb-3"><p className="text-sm font-semibold tabular-nums">{done.length}/{modules.length} {text.progress}</p><span className="text-sm font-semibold text-accent tabular-nums">{progress}%</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface"><div className="h-full bg-accent transition-[width] duration-300" style={{ width: `${progress}%` }} /></div>
                    <nav aria-label="Training modules" className="mt-4 space-y-1">
                        {modules.map((module, index) => {
                            const selected = active.id === module.id;
                            const isDone = completed.includes(module.id);
                            return <button key={module.id} type="button" onClick={() => setActiveId(module.id)} className={`flex min-h-14 w-full items-center gap-3 rounded-[10px] px-3 py-2 text-left transition-colors ${selected ? "bg-foreground text-background" : "hover:bg-surface"}`}><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isDone ? "bg-success text-white" : selected ? "bg-background/15" : "bg-surface text-muted-foreground"}`}>{isDone ? <Check className="h-4 w-4" /> : index + 1}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{module.title}</span><span className={`text-xs ${selected ? "text-background/60" : "text-muted-foreground"}`}>{module.time}</span></span><ChevronRight className="h-4 w-4 shrink-0" /></button>;
                        })}
                    </nav>
                    <button type="button" onClick={resetProgress} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 text-sm text-muted-foreground underline underline-offset-4"><RotateCcw className="h-4 w-4" />{text.reset}</button>
                </aside>

                <main className="rounded-[20px] bg-card p-6 lg:p-9">
                    <div className="flex items-start justify-between gap-5"><div><p className="text-sm font-semibold text-accent">{text.module} {modules.findIndex((module) => module.id === active.id) + 1} · {active.time}</p><h2 className="mt-2 text-balance font-serif text-3xl">{active.title}</h2></div>{completed.includes(active.id) && <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-success"><CheckCircle2 className="h-5 w-5" />{text.completed}</span>}</div>
                    <section className="mt-6 rounded-[12px] bg-accent-muted p-5"><h3 className="text-sm font-semibold text-foreground">{text.result}</h3><p className="mt-1 leading-7 text-foreground">{active.outcome}</p></section>
                    <section className="mt-7"><h3 className="font-serif text-xl">{text.steps}</h3><ol className="mt-4 space-y-4">{active.steps.map((step, index) => <li key={step} className="flex gap-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-bold text-background">{index + 1}</span><p className="pt-1 leading-7 text-foreground">{step}</p></li>)}</ol></section>
                    {active.warning && <div className="mt-6 flex gap-3 rounded-[12px] border border-warning-border bg-warning-bg p-4"><CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" /><p className="text-sm leading-6 text-foreground">{active.warning}</p></div>}
                    <div className="mt-8 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row"><a href={active.route ? getStaffDeskUrl(active.route) : getStaffPortalUrl()} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "soft", className: "min-h-12 gap-2" })}>{active.action}<ExternalLink className="h-4 w-4" /></a><button type="button" onClick={finishModule} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[8px] bg-accent px-5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2"><Check className="h-4 w-4" />{text.complete}</button></div>
                </main>
            </div>

            {done.length === modules.length && <section className="mt-6 rounded-[16px] border border-success-border bg-success-muted p-6"><h2 className="font-serif text-2xl">{text.finishTitle}</h2><p className="mt-2 leading-7 text-foreground">{text.finish}</p></section>}
            <section className="mt-6 grid gap-4 rounded-[16px] border border-border bg-surface p-6 sm:grid-cols-[1fr_auto] sm:items-center"><div><h2 className="flex items-center gap-2 font-serif text-xl"><BookOpen className="h-5 w-5 text-accent" />{text.helpTitle}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{text.help}</p></div><Link href="/dashboard/erpnext-guide/operating-model" className="inline-flex min-h-11 items-center gap-2 font-semibold text-accent underline underline-offset-4">{text.advanced}<ArrowRight className="h-4 w-4" /></Link></section>
        </div>
    );
}
