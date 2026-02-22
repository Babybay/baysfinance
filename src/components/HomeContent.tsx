"use client";

import React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useI18n } from "@/lib/i18n";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Users, CalendarDays, Calculator, FileText, Receipt, BarChart3 } from "lucide-react";

export function HomeContent() {
    const { t } = useI18n();

    return (
        <div className="min-h-screen flex flex-col bg-background selection:bg-foreground selection:text-background">
            <Navbar />

            <main className="flex-1">
                {/* Hero Section */}
                <section className="relative pt-[120px] pb-[80px] lg:pt-[180px] lg:pb-[140px] px-4 sm:px-6 lg:px-8">
                    <div className="container mx-auto text-center max-w-[1200px]">
                        <Badge variant="neutral" className="mb-[32px] px-3 py-1.5 text-body-sm">
                            <span className="h-1.5 w-1.5 rounded-full bg-accent mr-2 animate-pulse"></span>
                            {t.hero.badge}
                        </Badge>

                        <h1 className="font-serif text-h4 md:text-h3 lg:text-h1 text-foreground max-w-[1100px] mx-auto text-balance mb-[32px] leading-[1.1]">
                            {t.hero.heading}
                        </h1>

                        <p className="text-body md:text-body-lg text-muted max-w-[600px] mx-auto mb-[48px] text-balance leading-[1.6]">
                            {t.hero.description}
                        </p>

                        <div className="flex flex-col sm:flex-row justify-center items-center gap-[12px]">
                            <Link href="/sign-up">
                                <Button variant="accent" size="large" className="w-full sm:w-auto">
                                    {t.hero.cta} <ArrowRight className="ml-2 h-[18px] w-[18px]" />
                                </Button>
                            </Link>
                            <Link href="#features">
                                <Button variant="soft" size="large" className="w-full sm:w-auto">
                                    {t.hero.ctaSecondary}
                                </Button>
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Feature Section */}
                <section id="features" className="py-[120px] bg-surface">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="max-w-[800px] mb-[64px]">
                            <h2 className="font-serif text-h3 text-foreground mb-[24px]">
                                {t.features.heading}
                            </h2>
                            <p className="text-body-lg text-muted leading-[1.6]">
                                {t.features.description}
                            </p>
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
                                <div key={i} className="p-[36px] rounded-[16px] bg-card border border-border hover:-translate-y-1 transition-transform duration-300 shadow-[var(--shadow-subtle)_0px_2px_12px_0px]">
                                    <div className="h-[48px] w-[48px] rounded-[12px] bg-surface flex items-center justify-center mb-[24px]">
                                        <feature.icon className="h-6 w-6 text-accent" />
                                    </div>
                                    <h3 className="font-serif text-h5 mb-[16px] text-foreground">{feature.title}</h3>
                                    <p className="text-body text-muted leading-[1.6]">{feature.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-[120px]">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="bg-foreground rounded-[24px] overflow-hidden relative">
                            <div className="px-[36px] py-[80px] md:py-[120px] text-center text-background">
                                <h2 className="font-serif text-h5 md:text-h4 lg:text-h3 font-normal mb-[24px] max-w-[800px] mx-auto leading-tight">
                                    {t.cta.heading}
                                </h2>
                                <p className="text-body md:text-body-lg text-muted-foreground mb-[48px] max-w-[600px] mx-auto leading-[1.6]">
                                    {t.cta.description}
                                </p>
                                <Link href="/sign-up">
                                    <Button variant="accent" size="large">
                                        {t.cta.button}
                                    </Button>
                                </Link>
                                <div className="mt-[32px] flex items-center justify-center gap-[24px] text-body-sm text-muted-foreground">
                                    <span className="flex items-center"><CheckCircle2 className="h-4 w-4 mr-2 text-accent" /> {t.cta.free}</span>
                                    <span className="flex items-center"><CheckCircle2 className="h-4 w-4 mr-2 text-accent" /> {t.cta.noCard}</span>
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
