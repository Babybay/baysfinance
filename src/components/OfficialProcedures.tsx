"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n";
import {
    Shield, Clock, ChevronDown, ChevronUp,
    ExternalLink, AlertTriangle, ArrowRight,
    CheckCircle2, FileText,
    Briefcase, Building2, Plane, Calculator, BarChart3,
} from "lucide-react";

// ── Icon map ─────────────────────────────────────────────────────────────────
const iconMap: Record<string, React.ElementType> = {
    Briefcase, Building2, Plane, Calculator, BarChart3,
};

// ── Types for service data ───────────────────────────────────────────────────
interface Step { number: string; title: string; description: string; time: string }
interface Doc { name: string; category: string; notes: string }
interface Faq { q: string; a: string }
interface Source { name: string; url: string; description: string }
interface Service {
    id: string; tabLabel: string; icon: string;
    timelineTitle: string; timelineSubtitle: string;
    steps: Step[]; documents: Doc[];
    rejections: string[]; faqItems: Faq[];
}

export function OfficialProcedures() {
    const { t } = useI18n();
    const [activeTab, setActiveTab] = useState(0);
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const services = t.procedures.services as unknown as Service[];
    const active = services[activeTab];

    const categoryColors: Record<string, { bg: string; text: string }> = {
        mandatory: { bg: "bg-error-muted", text: "text-error" },
        conditional: { bg: "bg-accent-muted", text: "text-accent" },
        supporting: { bg: "bg-surface", text: "text-muted-foreground" },
    };

    const categoryLabels: Record<string, string> = {
        mandatory: t.procedures.mandatory,
        conditional: t.procedures.conditional,
        supporting: t.procedures.supporting,
    };

    // Reset FAQ when switching tab
    const switchTab = (idx: number) => {
        setActiveTab(idx);
        setOpenFaq(null);
    };

    return (
        <div className="min-h-screen bg-surface">
            {/* ── Hero ──────────────────────────────────────────── */}
            <section className="bg-gradient-to-b from-card to-surface py-20 lg:py-28">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-muted border border-accent/20 text-sm font-medium text-accent mb-8">
                        <Shield className="h-4 w-4" />
                        {t.procedures.badge}
                    </div>
                    <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-foreground leading-tight mb-6">
                        {t.procedures.title}
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        {t.procedures.subtitle}
                    </p>
                </div>
            </section>

            {/* ── Tab Navigation ─────────────────────────────────── */}
            <section className="sticky top-[72px] z-40 bg-card border-b border-border">
                <div className="max-w-4xl mx-auto px-6">
                    <div className="flex overflow-x-auto gap-1 py-2 scrollbar-hide">
                        {services.map((svc, idx) => {
                            const Icon = iconMap[svc.icon] || Briefcase;
                            return (
                                <button
                                    key={svc.id}
                                    onClick={() => switchTab(idx)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-sm font-medium whitespace-nowrap transition-all
                                        ${activeTab === idx
                                            ? "bg-accent text-white shadow-sm"
                                            : "text-muted-foreground hover:text-foreground hover:bg-surface"
                                        }`}
                                >
                                    <Icon className="h-4 w-4 shrink-0" />
                                    {svc.tabLabel}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ── Step Timeline ──────────────────────────────────── */}
            <section className="py-16 lg:py-24">
                <div className="max-w-4xl mx-auto px-6">
                    <h2 className="font-serif text-2xl sm:text-3xl text-foreground mb-2">{active.timelineTitle}</h2>
                    <p className="text-muted-foreground mb-12">{active.timelineSubtitle}</p>

                    <div className="space-y-0">
                        {active.steps.map((step, idx) => (
                            <div key={idx} className="relative flex gap-6">
                                <div className="flex flex-col items-center">
                                    <div className="h-12 w-12 rounded-full bg-accent-muted border-2 border-accent/30 flex items-center justify-center shrink-0">
                                        <span className="text-sm font-semibold text-accent">{step.number}</span>
                                    </div>
                                    {idx < active.steps.length - 1 && (
                                        <div className="w-px flex-1 bg-border min-h-[24px]" />
                                    )}
                                </div>
                                <div className="pb-10">
                                    <h3 className="font-semibold text-foreground text-lg mb-1">{step.title}</h3>
                                    <p className="text-sm text-muted-foreground mb-2">{step.description}</p>
                                    <div className="inline-flex items-center gap-1.5 text-xs font-medium text-accent">
                                        <Clock className="h-3 w-3" />
                                        {step.time}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Required Documents ─────────────────────────────── */}
            <section className="py-16 lg:py-24 bg-card">
                <div className="max-w-4xl mx-auto px-6">
                    <h2 className="font-serif text-2xl sm:text-3xl text-foreground mb-2">Required Documents</h2>
                    <p className="text-muted-foreground mb-10">Prepare these before starting your application.</p>

                    <div className="bg-surface rounded-[16px] border border-border overflow-hidden">
                        <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-3 bg-card border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            <div className="col-span-5">Document</div>
                            <div className="col-span-3">Category</div>
                            <div className="col-span-4">Notes</div>
                        </div>

                        {active.documents.map((doc, idx) => (
                            <div key={idx} className={`grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 px-6 py-4 ${idx !== active.documents.length - 1 ? "border-b border-border" : ""} hover:bg-card/50 transition-colors`}>
                                <div className="col-span-5 flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-muted shrink-0" />
                                    <span className="text-sm font-medium text-foreground">{doc.name}</span>
                                </div>
                                <div className="col-span-3">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-[6px] text-xs font-medium ${categoryColors[doc.category]?.bg} ${categoryColors[doc.category]?.text}`}>
                                        {categoryLabels[doc.category]}
                                    </span>
                                </div>
                                <div className="col-span-4">
                                    <span className="text-sm text-muted-foreground">{doc.notes}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Common Rejections ──────────────────────────────── */}
            <section className="py-16 lg:py-24">
                <div className="max-w-4xl mx-auto px-6">
                    <h2 className="font-serif text-2xl sm:text-3xl text-foreground mb-2">Common Rejection Reasons</h2>
                    <p className="text-muted-foreground mb-10">Avoid these mistakes that delay most applications.</p>

                    <div className="space-y-3">
                        {active.rejections.map((reason, idx) => (
                            <div key={idx} className="flex items-start gap-3 p-4 rounded-[12px] bg-error-muted border border-error/10">
                                <AlertTriangle className="h-4 w-4 text-error shrink-0 mt-0.5" />
                                <p className="text-sm text-foreground">{reason}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── FAQ ────────────────────────────────────────────── */}
            <section className="py-16 lg:py-24 bg-card">
                <div className="max-w-4xl mx-auto px-6">
                    <h2 className="font-serif text-2xl sm:text-3xl text-foreground mb-10">Frequently Asked Questions</h2>

                    <div className="space-y-3">
                        {active.faqItems.map((faq, idx) => (
                            <div key={idx} className="bg-surface rounded-[12px] border border-border overflow-hidden">
                                <button
                                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                                    className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-card/50 transition-colors"
                                >
                                    <span className="text-sm font-medium text-foreground pr-4">{faq.q}</span>
                                    {openFaq === idx ? (
                                        <ChevronUp className="h-4 w-4 text-muted shrink-0" />
                                    ) : (
                                        <ChevronDown className="h-4 w-4 text-muted shrink-0" />
                                    )}
                                </button>
                                {openFaq === idx && (
                                    <div className="px-6 pb-4">
                                        <p className="text-sm text-muted-foreground">{faq.a}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Official Sources & Disclaimer ──────────────────── */}
            <section className="py-16 lg:py-24">
                <div className="max-w-4xl mx-auto px-6">
                    <h2 className="font-serif text-2xl sm:text-3xl text-foreground mb-2">{t.procedures.sourcesTitle}</h2>
                    <p className="text-muted-foreground mb-10">{t.procedures.sourcesSubtitle}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                        {(t.procedures.sources as unknown as Source[]).map((source, idx) => (
                            <a key={idx} href={source.url} target="_blank" rel="noopener noreferrer"
                                className="group flex items-center justify-between p-4 rounded-[12px] bg-card border border-border hover:border-accent/30 hover:bg-accent-muted transition-all">
                                <div>
                                    <p className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">{source.name}</p>
                                    <p className="text-xs text-muted-foreground">{source.description}</p>
                                </div>
                                <ExternalLink className="h-4 w-4 text-muted group-hover:text-accent shrink-0 transition-colors" />
                            </a>
                        ))}
                    </div>

                    <p className="text-xs text-muted-foreground mb-6">{t.procedures.legalRefs}</p>

                    <div className="rounded-[12px] bg-card border border-border p-5">
                        <div className="flex items-start gap-3">
                            <Shield className="h-4 w-4 text-muted shrink-0 mt-0.5" />
                            <p className="text-xs text-muted-foreground leading-relaxed">{t.procedures.disclaimer}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Final CTA ──────────────────────────────────────── */}
            <section className="py-20 lg:py-28 bg-card">
                <div className="max-w-3xl mx-auto px-6 text-center">
                    <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-accent-muted mb-6">
                        <CheckCircle2 className="h-7 w-7 text-accent" />
                    </div>
                    <h2 className="font-serif text-2xl sm:text-3xl text-foreground mb-4">{t.procedures.ctaTitle}</h2>
                    <p className="text-muted-foreground mb-8 max-w-lg mx-auto">{t.procedures.ctaSubtitle}</p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link href="/sign-up">
                            <Button variant="accent" size="large" className="gap-2">
                                {t.procedures.ctaButton}
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                        <Link href="/contact">
                            <Button variant="soft" size="large">
                                {t.procedures.ctaSecondary}
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
