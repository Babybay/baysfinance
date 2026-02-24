"use client";

import React, { useEffect, useRef } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
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
} from "lucide-react";

// ── Subtle fade-up hook ──────────────────────────────────────────────────────
function useFadeUp() {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    el.style.opacity = "1";
                    el.style.transform = "translateY(0)";
                    observer.disconnect();
                }
            },
            { threshold: 0.12 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);
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
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
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
        return () => observer.disconnect();
    }, [delay]);

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
                {/* Avatar placeholder */}
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

// ── Main Component ───────────────────────────────────────────────────────────
export function HomeContent() {
    const { t } = useI18n();

    const heroRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = heroRef.current;
        if (!el) return;
        // stagger children
        const children = el.querySelectorAll<HTMLElement>("[data-hero-item]");
        children.forEach((child, i) => {
            child.style.opacity = "0";
            child.style.transform = "translateY(24px)";
            setTimeout(() => {
                child.style.transition = "opacity 0.7s ease, transform 0.7s ease";
                child.style.opacity = "1";
                child.style.transform = "translateY(0)";
            }, 100 + i * 120);
        });
    }, []);

    const stats = [
        { value: "2,400+", label: "Clients managed across firms", icon: Users },
        { value: "98%", label: "On-time compliance rate", icon: Shield },
        { value: "3×", label: "Faster reporting workflow", icon: TrendingUp },
        { value: "< 24h", label: "Average document turnaround", icon: Clock },
    ];

    const testimonials = [
        {
            quote:
                "This platform transformed how we manage our clients' tax deadlines. We went from spreadsheets to a fully automated calendar in under a week.",
            name: "Sarah Mitchell",
            role: "Senior Tax Consultant, Mitchell & Co.",
        },
        {
            quote:
                "The document management alone saved us hours every week. Everything is organized, searchable, and shared with clients instantly.",
            name: "David Lim",
            role: "Partner, Lim Accounting Group",
        },
        {
            quote:
                "Invoicing used to be a nightmare. Now it takes minutes. Our clients even comment on how professional the billing looks.",
            name: "Priya Nair",
            role: "Founder, Nair Financial Advisory",
        },
    ];

    return (
        <div className="min-h-screen flex flex-col bg-background selection:bg-foreground selection:text-background">
            <Navbar />

            <main className="flex-1">
                {/* ── Hero ──────────────────────────────────────────────── */}
                <section className="relative pt-[120px] pb-[80px] lg:pt-[180px] lg:pb-[140px] px-4 sm:px-6 lg:px-8 overflow-hidden">
                    {/* Subtle background gradient blob */}
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 flex items-center justify-center"
                    >
                        <div
                            style={{
                                width: "720px",
                                height: "480px",
                                background:
                                    "radial-gradient(ellipse at center, var(--color-accent, #4f46e5) 0%, transparent 70%)",
                                opacity: 0.04,
                                filter: "blur(60px)",
                            }}
                        />
                    </div>

                    <div ref={heroRef} className="container mx-auto text-center max-w-[1200px]">
                        <h1
                            data-hero-item
                            className="font-serif text-h4 md:text-h3 lg:text-h1 text-foreground max-w-[1100px] mx-auto text-balance mb-[32px] leading-[1.1]"
                        >
                            {t.hero.heading}
                        </h1>

                        <p
                            data-hero-item
                            className="text-body md:text-body-lg text-muted max-w-[600px] mx-auto mb-[48px] text-balance leading-[1.6]"
                        >
                            {t.hero.description}
                        </p>

                        <div
                            data-hero-item
                            className="flex flex-col sm:flex-row justify-center items-center gap-[12px]"
                        >
                            <Link href="/sign-up">
                                <Button variant="accent" size="large" className="w-full sm:w-auto group">
                                    {t.hero.cta}{" "}
                                    <ArrowRight className="ml-2 h-[18px] w-[18px] transition-transform duration-200 group-hover:translate-x-1" />
                                </Button>
                            </Link>
                            <Link href="#features">
                                <Button variant="soft" size="large" className="w-full sm:w-auto">
                                    {t.hero.ctaSecondary}
                                </Button>
                            </Link>
                        </div>

                        {/* Social proof strip */}
                        <div
                            data-hero-item
                            className="mt-[64px] flex flex-col sm:flex-row items-center justify-center gap-[32px] text-body-sm text-muted"
                        >
                            <span className="flex items-center gap-[8px]">
                                <CheckCircle2 className="h-4 w-4 text-accent" />
                                No credit card required
                            </span>
                            <span className="hidden sm:block h-[4px] w-[4px] rounded-full bg-border" />
                            <span className="flex items-center gap-[8px]">
                                <CheckCircle2 className="h-4 w-4 text-accent" />
                                Free 14-day trial
                            </span>
                            <span className="hidden sm:block h-[4px] w-[4px] rounded-full bg-border" />
                            <span className="flex items-center gap-[8px]">
                                <CheckCircle2 className="h-4 w-4 text-accent" />
                                Cancel anytime
                            </span>
                        </div>
                    </div>
                </section>

                {/* ── Stats ─────────────────────────────────────────────── */}
                <section className="py-[80px] border-y border-border bg-surface">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-[16px]">
                            {stats.map((stat, i) => (
                                <StatCard key={i} {...stat} />
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Features ──────────────────────────────────────────── */}
                <section id="features" className="py-[120px] bg-background">
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
                                { icon: Calculator, ...t.features.taxCalculator },
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
                    </div>
                </section>

                {/* ── Testimonials ──────────────────────────────────────── */}
                <section className="py-[120px] bg-surface border-t border-border">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="max-w-[600px] mb-[64px]">
                            <h2 className="font-serif text-h3 text-foreground mb-[24px]">
                                Trusted by consultants who care about their clients
                            </h2>
                            <p className="text-body-lg text-muted leading-[1.6]">
                                See how firms like yours are saving time and delivering better service.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-[24px]">
                            {testimonials.map((t, i) => (
                                <TestimonialCard key={i} {...t} delay={i * 120} />
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── CTA ───────────────────────────────────────────────── */}
                <section className="py-[120px]">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="bg-foreground rounded-[24px] overflow-hidden relative">
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
                                <Link href="/sign-up">
                                    <Button variant="accent" size="large" className="group">
                                        {t.cta.button}{" "}
                                        <ArrowRight className="ml-2 h-[18px] w-[18px] transition-transform duration-200 group-hover:translate-x-1" />
                                    </Button>
                                </Link>
                                <div className="mt-[32px] flex flex-col sm:flex-row items-center justify-center gap-[24px] text-body-sm text-muted-foreground">
                                    <span className="flex items-center gap-[8px]">
                                        <CheckCircle2 className="h-4 w-4 text-accent" /> {t.cta.free}
                                    </span>
                                    <span className="flex items-center gap-[8px]">
                                        <CheckCircle2 className="h-4 w-4 text-accent" /> {t.cta.noCard}
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