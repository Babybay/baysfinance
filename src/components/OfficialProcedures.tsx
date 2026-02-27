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
    BookOpen, Layers, XCircle, HelpCircle, FileCheck
} from "lucide-react";

// ── Icon map ─────────────────────────────────────────────────────────────────
const iconMap: Record<string, React.ElementType> = {
    Briefcase, Building2, Plane, Calculator, BarChart3,
};

// ── Types for service data ───────────────────────────────────────────────────
interface Stat { label: string; value: string; icon: string }
interface Overview { summary: string; stats: Stat[]; description: string; legalBasis: string }
interface Step { number: string; title: string; description: string; time: string; phase: string }
interface Doc { name: string; category: string; notes: string }
interface Rejection { reason: string; severity: "critical" | "warning"; tip: string }
interface Faq { q: string; a: string }
interface Source { name: string; url: string; description: string }

interface Service {
    id: string; tabLabel: string; icon: string;
    overview: Overview;
    timelineTitle: string; timelineSubtitle: string;
    steps: Step[];
    documents: Doc[];
    rejections: Rejection[];
    faqItems: Faq[];
}

export function OfficialProcedures() {
    const { t } = useI18n();
    // Level 1: Selected Service
    const [activeService, setActiveService] = useState(0);
    // Level 2: Selected Content Tab
    const [activeContentTab, setActiveContentTab] = useState<"overview" | "process" | "documents" | "rejections" | "faq" | "sources">("overview");
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const services = t.procedures.services as unknown as Service[];
    const active = services[activeService];
    const contentTabs = t.procedures.contentTabs as Record<string, string>;

    const categoryColors: Record<string, { bg: string; text: string }> = {
        mandatory: { bg: "bg-error/10", text: "text-error" },
        conditional: { bg: "bg-accent/10", text: "text-accent" },
        supporting: { bg: "bg-surface", text: "text-muted-foreground" },
    };

    const categoryLabels: Record<string, string> = {
        mandatory: t.procedures.mandatory,
        conditional: t.procedures.conditional,
        supporting: t.procedures.supporting,
    };

    const severityColors = {
        critical: "bg-error/10 border-error/20 text-error",
        warning: "bg-accent/10 border-accent/20 text-accent",
    };

    // Reset sub-state when switching main service
    const switchService = (idx: number) => {
        setActiveService(idx);
        setActiveContentTab("overview");
        setOpenFaq(null);
    };

    const Level2Tabs = [
        { id: "overview", label: contentTabs.overview, icon: BookOpen },
        { id: "process", label: contentTabs.process, icon: Layers },
        { id: "documents", label: contentTabs.documents, icon: FileText },
        { id: "rejections", label: contentTabs.rejections, icon: XCircle },
        { id: "faq", label: contentTabs.faq, icon: HelpCircle },
        { id: "sources", label: contentTabs.sources, icon: FileCheck },
    ] as const;

    return (
        <div className="min-h-screen bg-card overflow-hidden">
            {/* ── Hero ──────────────────────────────────────────── */}
            <section className="bg-gradient-to-b from-card to-surface py-16 lg:py-24">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-sm font-medium text-accent mb-6">
                        <Shield className="h-4 w-4" />
                        {t.procedures.badge}
                    </div>
                    <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-foreground leading-tight mb-6">
                        {t.procedures.title}
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                        {t.procedures.subtitle}
                    </p>
                    {t.procedures.lastUpdated && (
                        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-surface px-4 py-2 rounded-full border border-border">
                            <Clock className="h-4 w-4" />
                            {t.procedures.lastUpdated}
                        </div>
                    )}
                </div>
            </section>

            {/* ── Dashboard Shell containing the Navigation & Content ── */}
            <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-24">
                <div className="bg-surface border border-border rounded-2xl md:rounded-3xl overflow-hidden shadow-sm">

                    {/* Level 1: Service Selector (Pills) */}
                    <div className="bg-card border-b border-border p-4 sm:p-6 pb-0">
                        <div className="flex overflow-x-auto gap-2 pb-6 scrollbar-hide">
                            {services.map((svc, idx) => {
                                const Icon = iconMap[svc.icon] || Briefcase;
                                const isActive = activeService === idx;
                                return (
                                    <button
                                        key={svc.id}
                                        onClick={() => switchService(idx)}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all border
                                            ${isActive
                                                ? "bg-foreground text-background border-foreground shadow-sm"
                                                : "bg-surface text-muted-foreground border-border hover:bg-card hover:text-foreground"
                                            }`}
                                    >
                                        <Icon className="h-4 w-4 shrink-0" />
                                        {svc.tabLabel}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Level 2: Content Tabs (Underline) */}
                    <div className="bg-surface border-b border-border px-4 sm:px-6">
                        <div className="flex overflow-x-auto gap-6 sm:gap-8 scrollbar-hide">
                            {Level2Tabs.map((tab) => {
                                const isActive = activeContentTab === tab.id;
                                const TabIcon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            setActiveContentTab(tab.id);
                                            setOpenFaq(null);
                                        }}
                                        className={`flex items-center gap-2 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                                            ${isActive
                                                ? "border-accent text-accent"
                                                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                                            }`}
                                    >
                                        <TabIcon className="h-4 w-4" />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="p-6 sm:p-8 lg:p-12 min-h-[500px]">

                        {/* 1. OVERVIEW TAB */}
                        {activeContentTab === "overview" && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <h2 className="text-2xl font-serif text-foreground mb-4">
                                    {contentTabs.overview}
                                </h2>
                                <p className="text-base text-muted-foreground leading-relaxed mb-10 max-w-3xl">
                                    {active.overview.summary}
                                </p>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                                    {active.overview.stats.map((stat, i) => {
                                        const StatIcon = stat.icon === "Clock" ? Clock : stat.icon === "FileText" ? FileText : CheckCircle2;
                                        return (
                                            <div key={i} className="bg-card border border-border rounded-xl p-5 flex items-start gap-4">
                                                <div className="p-2.5 rounded-lg bg-surface shrink-0">
                                                    <StatIcon className="h-5 w-5 text-accent" />
                                                </div>
                                                <div>
                                                    <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                                                    <p className="text-lg font-semibold text-foreground">{stat.value}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="prose prose-sm dark:prose-invert max-w-none mb-10">
                                    <p className="text-muted-foreground leading-relaxed">
                                        {active.overview.description}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 px-4 py-3 bg-surface border border-border rounded-lg text-sm text-muted-foreground inline-flex mb-12">
                                    <Shield className="h-4 w-4 text-accent" />
                                    <span className="font-medium text-foreground">Legal Basis:</span> {active.overview.legalBasis}
                                </div>

                                {/* Soft CTA */}
                                <div className="bg-accent/5 border border-accent/20 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
                                    <div>
                                        <h3 className="text-lg font-medium text-foreground mb-1">{t.procedures.overviewCta}</h3>
                                        <p className="text-sm text-muted-foreground">Our team can handle this entire process for you.</p>
                                    </div>
                                    <Link href="/contact">
                                        <Button variant="accent" className="shrink-0">
                                            {t.procedures.overviewCtaButton}
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        )}

                        {/* 2. PROCESS TAB */}
                        {activeContentTab === "process" && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <h2 className="text-2xl font-serif text-foreground mb-2">{active.timelineTitle}</h2>
                                <p className="text-muted-foreground mb-12">{active.timelineSubtitle}</p>

                                <div className="space-y-0 mb-12">
                                    {active.steps.map((step, idx) => (
                                        <div key={idx} className="relative flex gap-6">
                                            <div className="flex flex-col items-center">
                                                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-surface border-2 border-border flex items-center justify-center shrink-0 z-10">
                                                    <span className="text-xs sm:text-sm font-semibold text-foreground">{step.number}</span>
                                                </div>
                                                {idx < active.steps.length - 1 && (
                                                    <div className="w-px flex-1 bg-border min-h-[32px]" />
                                                )}
                                            </div>
                                            <div className="pb-12 pt-1 w-full flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                                <div>
                                                    <h3 className="font-semibold text-foreground text-lg mb-2">{step.title}</h3>
                                                    <p className="text-sm text-muted-foreground mb-3 max-w-xl">{step.description}</p>
                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-surface px-2.5 py-1 rounded-md border border-border">
                                                            <Clock className="h-3.5 w-3.5" />
                                                            {step.time}
                                                        </div>
                                                        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-accent bg-accent/10 px-2.5 py-1 rounded-md">
                                                            {step.phase}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Soft CTA */}
                                <div className="bg-surface border border-border rounded-2xl p-6 text-center">
                                    <p className="text-sm text-foreground font-medium mb-4">{t.procedures.processCta}</p>
                                    <Link href="/contact">
                                        <Button variant="outline" size="small">
                                            {t.procedures.processCtaButton}
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        )}

                        {/* 3. DOCUMENTS TAB */}
                        {activeContentTab === "documents" && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <h2 className="text-2xl font-serif text-foreground mb-2">{t.procedures.docsTitle}</h2>
                                <p className="text-muted-foreground mb-10">{t.procedures.docsSubtitle}</p>

                                <div className="border border-border rounded-xl overflow-hidden">
                                    {active.documents.map((doc, idx) => (
                                        <div key={idx} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 ${idx !== active.documents.length - 1 ? "border-b border-border" : ""} hover:bg-card/50 transition-colors`}>
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-surface rounded-lg">
                                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">{doc.name}</p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">{doc.notes}</p>
                                                </div>
                                            </div>
                                            <div className="shrink-0 flex sm:justify-end">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${categoryColors[doc.category]?.bg} ${categoryColors[doc.category]?.text}`}>
                                                    {categoryLabels[doc.category]}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 4. REJECTIONS TAB */}
                        {activeContentTab === "rejections" && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <h2 className="text-2xl font-serif text-foreground mb-2">{t.procedures.rejectTitle}</h2>
                                <p className="text-muted-foreground mb-10">{t.procedures.rejectSubtitle}</p>

                                <div className="grid gap-4">
                                    {(active.rejections as Rejection[]).map((rejection, idx) => (
                                        <div key={idx} className={`p-5 rounded-xl border ${severityColors[rejection.severity]} flex items-start gap-4`}>
                                            <div className={`p-2 rounded-lg bg-background/50 shrink-0 mt-0.5`}>
                                                <AlertTriangle className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-semibold mb-1">{rejection.reason}</h3>
                                                <p className="text-sm opacity-90 max-w-2xl">{rejection.tip}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 5. FAQ TAB */}
                        {activeContentTab === "faq" && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <h2 className="text-2xl font-serif text-foreground mb-10">{t.procedures.faqTitle}</h2>

                                <div className="space-y-3">
                                    {active.faqItems.map((faq, idx) => (
                                        <div key={idx} className="bg-card border border-border rounded-xl overflow-hidden">
                                            <button
                                                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                                                className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-surface/50 transition-colors"
                                            >
                                                <span className="text-sm font-medium text-foreground pr-4 text-balance">{faq.q}</span>
                                                <div className="shrink-0 ml-2">
                                                    {openFaq === idx ? (
                                                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                                    ) : (
                                                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                    )}
                                                </div>
                                            </button>

                                            <div
                                                className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaq === idx ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                                                    }`}
                                            >
                                                <div className="px-6 pb-5 pt-1">
                                                    <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 6. SOURCES TAB */}
                        {activeContentTab === "sources" && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <h2 className="text-2xl font-serif text-foreground mb-2">{t.procedures.sourcesTitle}</h2>
                                <p className="text-muted-foreground mb-10">{t.procedures.sourcesSubtitle}</p>

                                <div className="flex items-center gap-2 mb-6">
                                    <div className="h-2 w-2 rounded-full bg-[#10B981]"></div>
                                    <span className="text-xs font-medium text-muted-foreground">{t.procedures.sourcesVerified}</span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
                                    {(t.procedures.sources as unknown as Source[]).map((source, idx) => (
                                        <a key={idx} href={source.url} target="_blank" rel="noopener noreferrer"
                                            className="group flex flex-col justify-between p-5 rounded-xl bg-card border border-border hover:border-accent/40 hover:bg-surface transition-all h-full">
                                            <div className="mb-4">
                                                <div className="flex items-start justify-between mb-2">
                                                    <p className="text-sm font-bold text-foreground group-hover:text-accent transition-colors">{source.name}</p>
                                                    <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-accent shrink-0 transition-colors" />
                                                </div>
                                                <p className="text-xs text-muted-foreground leading-relaxed">{source.description}</p>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground truncate opacity-60 font-mono">{source.url}</p>
                                        </a>
                                    ))}
                                </div>

                                <div className="rounded-xl bg-surface border border-border p-6">
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 rounded-lg bg-card border border-border shrink-0 mt-0.5">
                                            <Shield className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-foreground mb-1">Important Disclaimer</p>
                                            <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">{t.procedures.disclaimer}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </section>

            {/* ── Final CTA ──────────────────────────────────────── */}
            <section className="py-20 lg:py-28 bg-card border-t border-border">
                <div className="max-w-3xl mx-auto px-6 text-center">
                    <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-surface border border-border mb-8 shadow-sm">
                        <CheckCircle2 className="h-8 w-8 text-accent" />
                    </div>
                    <h2 className="font-serif text-3xl sm:text-4xl text-foreground mb-4">{t.procedures.ctaTitle}</h2>
                    <p className="text-lg text-muted-foreground mb-10 max-w-lg mx-auto">{t.procedures.ctaSubtitle}</p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link href="/sign-up">
                            <Button variant="accent" size="large" className="gap-2 w-full sm:w-auto">
                                {t.procedures.ctaButton}
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                        <Link href="/contact">
                            <Button variant="outline" size="large" className="w-full sm:w-auto bg-surface">
                                {t.procedures.ctaSecondary}
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
