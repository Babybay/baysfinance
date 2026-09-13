"use client";

import React, { useEffect, useRef } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { WorkspacePreview } from "@/components/home/WorkspacePreview";
import { buttonVariants } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n";
import Link from "next/link";
import {
    CheckCircle2,
    ArrowRight,
    Users,
    CalendarDays,
    Calculator,
    FileText,
    Receipt,
    BarChart3,
    Star,
    TrendingUp,
    Shield,
    Clock,
    AlertTriangle,
    FileSearch,
    CircleAlert,
    Award,
    Briefcase,
    Building2,
    Scale,
    Plane,
    Wine,
    BookOpen,
    Search,
    BadgeCheck,
    Lock,
} from "lucide-react";

// ── Subtle fade-up hook ──────────────────────────────────────────────────────
function useFadeUp(delay = 0) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            el.style.opacity = "1";
            el.style.transform = "none";
            return;
        }
        let timer: ReturnType<typeof setTimeout>;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    timer = setTimeout(() => {
                        if (el) {
                            el.style.opacity = "1";
                            el.style.transform = "translateY(0)";
                        }
                    }, delay);
                    observer.disconnect();
                }
            },
            { threshold: 0.12 }
        );
        observer.observe(el);
        return () => { observer.disconnect(); clearTimeout(timer); };
    }, [delay]);
    return ref;
}

// ── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ value, label, icon: Icon }: { value: string; label: string; icon: React.ElementType }) {
    const ref = useFadeUp();
    return (
        <div
            ref={ref}
            style={{ opacity: 0, transform: "translateY(20px)", transition: "opacity 0.6s ease, transform 0.6s ease" }}
            className="flex flex-col gap-[12px] p-[32px] rounded-[16px] bg-card border border-border shadow-[0px_2px_12px_0px_var(--shadow-subtle)]"
        >
            <div className="h-[40px] w-[40px] rounded-[10px] bg-surface flex items-center justify-center">
                <Icon className="h-5 w-5 text-accent" />
            </div>
            <p className="font-serif text-h3 text-foreground leading-none">{value}</p>
            <p className="text-body-sm text-muted">{label}</p>
        </div>
    );
}

// ── Problem Card ─────────────────────────────────────────────────────────────
function ProblemCard({
    title,
    description,
    icon: Icon,
    delay = 0,
}: {
    title: string;
    description: string;
    icon: React.ElementType;
    delay?: number;
}) {
    const ref = useFadeUp(delay);
    return (
        <div
            ref={ref}
            style={{
                opacity: 0,
                transform: "translateY(24px)",
                transition: "opacity 0.65s ease, transform 0.65s ease",
            }}
            className="flex gap-[20px] p-[32px] rounded-[16px] bg-card border border-border shadow-[0px_2px_12px_0px_var(--shadow-subtle)]"
        >
            <div className="h-[48px] w-[48px] shrink-0 rounded-[12px] bg-error-muted flex items-center justify-center">
                <Icon className="h-6 w-6 text-error" />
            </div>
            <div>
                <h3 className="font-serif text-h6 text-foreground mb-[8px]">{title}</h3>
                <p className="text-body-sm text-muted leading-[1.6]">{description}</p>
            </div>
        </div>
    );
}

// ── Testimonial Card ─────────────────────────────────────────────────────────
function TestimonialCard({
    quote,
    name,
    role,
    delay = 0,
}: {
    quote: string;
    name: string;
    role: string;
    delay?: number;
}) {
    const ref = useFadeUp(delay);
    return (
        <div
            ref={ref}
            style={{
                opacity: 0,
                transform: "translateY(24px)",
                transition: "opacity 0.65s ease, transform 0.65s ease",
            }}
            className="flex flex-col gap-[24px] p-[36px] rounded-[16px] bg-card border border-border shadow-[0px_2px_12px_0px_var(--shadow-subtle)]"
        >
            {/* Stars */}
            <div className="flex gap-[4px]">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                ))}
            </div>
            <p className="text-body text-foreground leading-[1.7] flex-1">&ldquo;{quote}&rdquo;</p>
            <div className="flex items-center gap-[12px] pt-[8px] border-t border-border">
                <div className="h-[40px] w-[40px] rounded-full bg-surface flex items-center justify-center text-body-sm font-medium text-accent select-none">
                    {name.charAt(0)}
                </div>
                <div>
                    <p className="text-body-sm font-medium text-foreground">{name}</p>
                    <p className="text-body-sm text-muted">{role}</p>
                </div>
            </div>
        </div>
    );
}

// ── Service Card ─────────────────────────────────────────────────────────────
function ServiceCard({
    title,
    icon: Icon,
    delay = 0,
}: {
    title: string;
    icon: React.ElementType;
    delay?: number;
}) {
    const ref = useFadeUp(delay);
    return (
        <div
            ref={ref}
            style={{
                opacity: 0,
                transform: "translateY(16px)",
                transition: "opacity 0.5s ease, transform 0.5s ease",
            }}
            className="soft-panel soft-panel-interactive group flex items-center gap-[16px] p-[24px] rounded-[20px] cursor-default"
        >
            <div className="h-[44px] w-[44px] shrink-0 rounded-[12px] bg-surface flex items-center justify-center transition-colors duration-300 group-hover:bg-accent/10">
                <Icon className="h-5 w-5 text-accent" />
            </div>
            <p className="text-body font-medium text-foreground">{title}</p>
        </div>
    );
}

function SectorCard({
    title,
    description,
    icon: Icon,
}: {
    title: string;
    description: string;
    icon: React.ElementType;
}) {
    return (
        <article className="soft-panel soft-panel-interactive rounded-[22px] p-6">
            <div className="soft-inset flex h-11 w-11 items-center justify-center rounded-[14px] text-accent">
                <Icon className="h-5 w-5" />
            </div>
            <h3 className="mt-5 font-serif text-h6 text-foreground">{title}</h3>
            <p className="mt-2 text-body-sm leading-6 text-muted">{description}</p>
        </article>
    );
}

// ── Main Component ───────────────────────────────────────────────────────────
export function HomeContent() {
    const { t, locale } = useI18n();

    const stats = [
        { value: "2,400+", label: locale === "id" ? "Klien yang dikelola" : "Clients managed across firms", icon: Users },
        { value: "98%", label: locale === "id" ? "Kepatuhan tepat waktu" : "On-time compliance rate", icon: Shield },
        { value: "3×", label: locale === "id" ? "Proses pelaporan lebih cepat" : "Faster reporting workflow", icon: TrendingUp },
        { value: "< 24h", label: locale === "id" ? "Rata-rata proses dokumen" : "Average document turnaround", icon: Clock },
    ];

    const problemIcons = [AlertTriangle, FileSearch, CircleAlert];

    const serviceItems = [
        { title: t.services.perpajakan, icon: Calculator },
        { title: t.services.akuntansi, icon: BookOpen },
        { title: t.services.pendirianPerusahaan, icon: Building2 },
        { title: t.services.legalitas, icon: Scale },
        { title: t.services.perijinanUsaha, icon: Briefcase },
        { title: t.services.izinTinggal, icon: Plane },
        { title: t.services.audit, icon: Search },
        { title: t.services.financialAdvisory, icon: BarChart3 },
        { title: t.services.perijinanBangunan, icon: Building2 },
        { title: t.services.kitasKitap, icon: FileText },
        { title: t.services.perijinanMikol, icon: Wine },
        { title: t.services.appraisal, icon: BadgeCheck },
    ];

    const sectorContent = locale === "id"
        ? {
            eyebrow: "Keahlian lintas sektor",
            heading: "Konsultasi yang memahami cara bisnis Anda berjalan.",
            description: "Kami memulai dari proses, dokumen, dan risiko operasional sektor Anda—lalu menyusun layanan pajak, akuntansi, legalitas, atau advisory yang tepat.",
            items: [
                ["Perdagangan, Ritel & F&B", "Outlet, transaksi, persediaan, supplier, dan kebutuhan perizinan."],
                ["Manufaktur & Distribusi", "Alur pembelian, gudang, costing, dan kontrol operasional."],
                ["Jasa Profesional & Digital", "Kontrak layanan, proyek, penagihan berkala, dan pelaporan."],
                ["Properti & Konstruksi", "Struktur proyek, vendor, termin, anggaran, dan dokumentasi."],
                ["Hospitality & Pariwisata", "Channel penjualan, setoran, tenaga kerja, dan kesiapan operasional."],
                ["Investasi & Mobilitas Global", "Struktur entitas, kebutuhan izin, dan koordinasi spesialis."],
            ],
        }
        : {
            eyebrow: "Cross-sector expertise",
            heading: "Consulting built around how your business actually runs.",
            description: "We begin with your sector’s processes, documents, and operational risks—then shape the right tax, accounting, licensing, or advisory engagement.",
            items: [
                ["Trade, Retail & F&B", "Outlets, transactions, inventory, suppliers, and relevant licensing."],
                ["Manufacturing & Distribution", "Procurement, warehouses, costing, and operational controls."],
                ["Professional & Digital Services", "Service contracts, projects, recurring billing, and reporting."],
                ["Property & Construction", "Project structures, vendors, milestones, budgets, and documentation."],
                ["Hospitality & Tourism", "Sales channels, deposits, workforce, and operational readiness."],
                ["Investment & Global Mobility", "Entity structures, permit requirements, and specialist coordination."],
            ],
        };
    const sectorIcons = [Building2, Briefcase, BarChart3, Scale, Users, Plane];

    return (
        <div className="cal-home min-h-screen flex flex-col bg-background selection:bg-foreground selection:text-background">
            <Navbar />
            <a href="#main-content" className="cal-skip-link">{locale === "id" ? "Langsung ke konten" : "Skip to content"}</a>
            <main id="main-content" className="flex-1">
                <section className="cal-hero">
                    <div className="cal-container grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
                        <div className="cal-hero-copy">
                            <p className="cal-eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-accent" />{locale === "id" ? "PARTNER UNTUK LANGKAH BISNIS ANDA" : "YOUR PARTNER IN BUSINESS CLARITY"}</p>
                            <h1 className="cal-hero-title">{locale === "id" ? <>Bisnis lebih tenang.<br /><span>Langkah lebih pasti.</span></> : <>Less complexity.<br /><span>More possibility.</span></>}</h1>
                            <p className="mt-6 max-w-[470px] text-base leading-[1.8] text-muted sm:text-lg">{locale === "id" ? "Pajak, akuntansi, dan legalitas yang lebih terarah. CAL membantu Anda mengurus detail, agar Anda bisa fokus mengembangkan bisnis." : "Tax, accounting, and business matters, made clear. CAL helps you take care of the details, so you can focus on moving your business forward."}</p>
                            <div className="mt-8 flex flex-wrap gap-3">
                                <Link href="/crm/register" className={buttonVariants({ variant: "accent", size: "large", className: "gap-3" })}>{locale === "id" ? "Mulai konsultasi" : "Let’s talk business"}<ArrowRight className="h-4 w-4" /></Link>
                                <Link href="/#services" className={buttonVariants({ variant: "light", size: "large", className: "gap-3" })}>{locale === "id" ? "Jelajahi layanan" : "Explore our services"}<ArrowRight className="h-4 w-4 -rotate-45" /></Link>
                            </div>
                            <div className="mt-9 flex flex-wrap gap-x-5 gap-y-3 border-t border-border pt-6 text-xs text-muted">
                                <span className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-accent" />{locale === "id" ? "Pendampingan spesialis" : "Specialist-led support"}</span>
                                <span className="flex items-center gap-2"><Lock className="h-4 w-4 text-accent" />{locale === "id" ? "Portal klien pribadi" : "Your private client portal"}</span>
                            </div>
                            <p className="mt-4 text-xs leading-5 text-muted">{locale === "id" ? "Portal klien oleh CAL. CRM dan operasional tim melalui ERPNext." : "Your client portal by CAL. Team CRM and operations powered by ERPNext."}</p>
                        </div>
                        <WorkspacePreview />
                    </div>
                </section>

                {/* ── 2. Social Proof Bar ───────────────────────────────────── */}
                <section className="py-[40px] border-y border-border bg-surface">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <p className="text-body-sm text-muted mb-[8px]">{t.socialProof.label}</p>
                        <p className="text-body-lg font-serif text-foreground tracking-wide">{t.socialProof.cities}</p>
                    </div>
                </section>

                {/* ── 3. Problem-Agitate ────────────────────────────────────── */}
                <section className="py-[100px] lg:py-[120px] bg-background">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="max-w-[600px] mb-[56px]">
                            <h2 className="font-serif text-h3 text-foreground mb-[20px]">
                                {t.problem.heading}
                            </h2>
                            <p className="text-body-lg text-muted leading-[1.6]">{t.problem.description}</p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-[20px]">
                            {t.problem.items.map((item, i) => (
                                <ProblemCard
                                    key={i}
                                    title={item.title}
                                    description={item.description}
                                    icon={problemIcons[i]}
                                    delay={i * 100}
                                />
                            ))}
                        </div>

                        {/* Inline CTA after problem */}
                        <div className="mt-[56px] text-center">
                            <Link href="#features" className="inline-flex items-center gap-[8px] text-accent font-medium text-body hover:underline underline-offset-4 transition-all group">
                                {locale === "id" ? "Temukan cara kerja CAL" : "See how CAL can help"}
                                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                            </Link>
                        </div>
                    </div>
                </section>

                {/* ── 4. Services Grid ──────────────────────────────────────── */}
                <section id="services" className="py-[100px] lg:py-[120px] bg-surface border-t border-border">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="max-w-[600px] mb-[56px]">
                            <h2 className="font-serif text-h3 text-foreground mb-[20px]">
                                {t.services.heading}
                            </h2>
                            <p className="text-body-lg text-muted leading-[1.6]">{t.services.subtitle}</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[16px]">
                            {serviceItems.map((service, i) => (
                                <ServiceCard
                                    key={i}
                                    title={service.title}
                                    icon={service.icon}
                                    delay={i * 60}
                                />
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── 5. Sector Expertise ───────────────────────────────────── */}
                <section className="py-[100px] lg:py-[120px] bg-background">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="mx-auto mb-[56px] max-w-[760px] text-center">
                            <p className="mb-4 text-body-sm font-semibold uppercase tracking-[0.16em] text-accent">{sectorContent.eyebrow}</p>
                            <h2 className="font-serif text-h3 text-foreground">{sectorContent.heading}</h2>
                            <p className="mt-5 text-body-lg leading-[1.6] text-muted">{sectorContent.description}</p>
                        </div>
                        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            {sectorContent.items.map(([title, description], index) => (
                                <SectorCard key={title} title={title} description={description} icon={sectorIcons[index]} />
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── 6. Features ──────────────────────────────────────────── */}
                <section id="features" className="py-[100px] lg:py-[120px] bg-background">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="max-w-[800px] mb-[64px]">
                            <h2 className="font-serif text-h3 text-foreground mb-[24px]">
                                {t.features.heading}
                            </h2>
                            <p className="text-body-lg text-muted leading-[1.6]">{t.features.description}</p>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-[24px]">
                            {[
                                { icon: Users, ...t.features.clientManagement },
                                { icon: CalendarDays, ...t.features.taxCalendar },
                                { icon: FileText, ...t.features.documentManagement },
                                { icon: Receipt, ...t.features.invoiceBilling },
                                { icon: BarChart3, ...t.features.complianceReports },
                            ].map((feature, i) => (
                                <div
                                    key={i}
                                    className="group p-[36px] rounded-[16px] bg-card border border-border hover:-translate-y-1 transition-all duration-300 shadow-[0px_2px_12px_0px_var(--shadow-subtle)] hover:shadow-[0px_8px_24px_0px_var(--shadow-subtle)] cursor-default"
                                >
                                    <div className="h-[48px] w-[48px] rounded-[12px] bg-surface flex items-center justify-center mb-[24px] transition-colors duration-300 group-hover:bg-accent/10">
                                        <feature.icon className="h-6 w-6 text-accent" />
                                    </div>
                                    <h3 className="font-serif text-h5 mb-[16px] text-foreground">{feature.title}</h3>
                                    <p className="text-body text-muted leading-[1.6]">{feature.description}</p>
                                </div>
                            ))}
                        </div>

                        {/* CTA after features */}
                        <div className="mt-[64px] text-center">
                            <Link href="/portal" className={buttonVariants({ variant: "accent", size: "large", className: "group" })}>
                                    {t.hero.cta}{" "}
                                    <ArrowRight className="ml-2 h-[18px] w-[18px] transition-transform duration-200 group-hover:translate-x-1" />
                            </Link>
                        </div>
                    </div>
                </section>

                {/* ── 6. Founder Authority ──────────────────────────────────── */}
                <section id="about" className="py-[100px] lg:py-[120px] bg-surface border-t border-border">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="max-w-[900px] mx-auto">
                            <div className="grid md:grid-cols-[280px_1fr] gap-[48px] lg:gap-[64px] items-start">
                                {/* Avatar / Visual */}
                                <div className="flex flex-col items-center md:items-start gap-[24px]">
                                    <div className="h-[200px] w-[200px] rounded-[24px] bg-gradient-to-br from-accent/20 via-accent/10 to-transparent flex items-center justify-center border border-accent/10">
                                        <span className="font-serif text-[64px] text-accent/60 select-none">CAL.</span>
                                    </div>
                                    {/* Credentials */}
                                    <div className="flex flex-col gap-[12px] w-full">
                                        {[t.founder.credential1, t.founder.credential2, t.founder.credential3].map((cred, i) => (
                                            <div key={i} className="flex items-center gap-[10px]">
                                                <Award className="h-4 w-4 text-accent shrink-0" />
                                                <span className="text-body-sm text-foreground">{cred}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Content */}
                                <div>
                                    <h2 className="font-serif text-h4 lg:text-h3 text-foreground mb-[16px]">
                                        {t.founder.heading}
                                    </h2>
                                    <p className="text-body-sm text-accent font-medium mb-[24px]">
                                        {t.founder.name} — {t.founder.title}
                                    </p>
                                    <p className="text-body text-muted leading-[1.8] mb-[32px]">
                                        {t.founder.bio}
                                    </p>
                                    <Link href="/crm/register" className="inline-flex items-center gap-[8px] text-accent font-medium text-body hover:underline underline-offset-4 transition-all group">
                                        {locale === "id" ? "Mulai konsultasi" : "Book a consultation"}
                                        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── 7. Testimonials ──────────────────────────────────────── */}
                <section className="py-[100px] lg:py-[120px] bg-background">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="max-w-[600px] mb-[64px]">
                            <h2 className="font-serif text-h3 text-foreground mb-[24px]">
                                {t.testimonials.heading}
                            </h2>
                            <p className="text-body-lg text-muted leading-[1.6]">
                                {t.testimonials.description}
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-[24px]">
                            {t.testimonials.items.map((testimonial, i) => (
                                <TestimonialCard key={i} {...testimonial} delay={i * 120} />
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── 8. Stats ─────────────────────────────────────────────── */}
                <section className="py-[80px] border-y border-border bg-surface">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-[16px]">
                            {stats.map((stat, i) => (
                                <StatCard key={i} {...stat} />
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── 9. Final CTA ─────────────────────────────────────────── */}
                <section id="contact" className="py-[120px]">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="cal-cta rounded-[24px] overflow-hidden relative">
                            {/* Subtle inner glow */}
                            <div
                                aria-hidden
                                className="pointer-events-none absolute inset-0"
                                style={{
                                    background:
                                        "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.06) 0%, transparent 60%)",
                                }}
                            />
                            <div className="relative px-[36px] py-[80px] md:py-[120px] text-center text-background">
                                <h2 className="font-serif text-h5 md:text-h4 lg:text-h3 font-normal mb-[24px] max-w-[800px] mx-auto leading-tight">
                                    {t.cta.heading}
                                </h2>
                                <p className="text-body md:text-body-lg text-muted-foreground mb-[48px] max-w-[600px] mx-auto leading-[1.6]">
                                    {t.cta.description}
                                </p>
                                <Link href="/portal" className={buttonVariants({ variant: "accent", size: "large", className: "group" })}>
                                        {t.cta.button}{" "}
                                        <ArrowRight className="ml-2 h-[18px] w-[18px] transition-transform duration-200 group-hover:translate-x-1" />
                            </Link>
                                <div className="mt-[32px] flex flex-col sm:flex-row items-center justify-center gap-[24px] text-body-sm text-muted-foreground">
                                    <span className="flex items-center gap-[8px]">
                                        <CheckCircle2 className="h-4 w-4 text-accent" /> {t.cta.free}
                                    </span>
                                    <span className="flex items-center gap-[8px]">
                                        <CheckCircle2 className="h-4 w-4 text-accent" /> {t.cta.noCard}
                                    </span>
                                    <span className="flex items-center gap-[8px]">
                                        <CheckCircle2 className="h-4 w-4 text-accent" /> {t.cta.guarantee}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
