"use client";

import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, LogIn, UsersRound } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { buttonVariants } from "@/components/ui/Button";
import { getStaffPortalUrl } from "@/lib/staff-guide";

const staffPortalUrl = getStaffPortalUrl();

export function PortalLanding() {
    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <main className="container mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:py-28">
                <div className="mx-auto max-w-2xl text-center">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Bay&apos;s Finance portals</p>
                    <h1 className="mt-4 font-serif text-4xl text-foreground sm:text-5xl">The right workspace for every relationship.</h1>
                    <p className="mt-5 text-lg leading-8 text-muted-foreground">Our team manages CRM, accounting, tax, and operational work in ERPNext. Clients use the Bay&apos;s Finance portal for access and service requests.</p>
                </div>
                <div className="mt-12 grid gap-6 md:grid-cols-2">
                    <section className="rounded-[20px] border border-border bg-card p-7 shadow-[var(--shadow-color)_0px_2px_12px_0px]">
                        <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-accent-muted text-accent"><BriefcaseBusiness className="h-6 w-6" /></div>
                        <h2 className="mt-5 font-serif text-2xl text-foreground">Staff portal</h2>
                        <p className="mt-3 leading-7 text-muted-foreground">For Bay&apos;s Finance staff. Sign in to ERPNext to manage leads, CRM, accounting, tax work, projects, and client operations.</p>
                        <a href={staffPortalUrl} className={buttonVariants({ variant: "accent", className: "mt-6 w-full gap-2" })}>
                            Open ERPNext staff portal <ArrowRight className="h-4 w-4" />
                        </a>
                    </section>
                    <section className="rounded-[20px] border border-border bg-card p-7 shadow-[var(--shadow-color)_0px_2px_12px_0px]">
                        <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-accent-muted text-accent"><UsersRound className="h-6 w-6" /></div>
                        <h2 className="mt-5 font-serif text-2xl text-foreground">Client portal</h2>
                        <p className="mt-3 leading-7 text-muted-foreground">For existing clients. Access your shared documents, service updates, and client-facing information.</p>
                        <Link href="/sign-in" className={buttonVariants({ variant: "soft", className: "mt-6 w-full gap-2" })}>
                            Client sign in <LogIn className="h-4 w-4" />
                        </Link>
                        <p className="mt-5 text-sm text-muted-foreground">New to Bay&apos;s Finance?</p>
                        <Link href="/crm/register" className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">Send a service request <ArrowRight className="h-4 w-4" /></Link>
                    </section>
                </div>
            </main>
            <Footer />
        </div>
    );
}
