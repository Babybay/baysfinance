"use client";

import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, LogIn, UsersRound } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { buttonVariants } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n";
import { getStaffPortalUrl, getStaffDeskUrl } from "@/lib/staff-guide";

const staffPortalUrl = getStaffPortalUrl();

export function PortalLanding() {
    const { locale } = useI18n();
    const id = locale === "id";
    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <main className="container mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:py-28">
                <div className="mx-auto max-w-2xl text-center">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">{id ? "Portal CAL" : "CAL portals"}</p>
                    <h1 className="mt-4 font-serif text-4xl text-foreground sm:text-5xl">{id ? "Ruang yang tepat untuk setiap kebutuhan." : "The right workspace for every relationship."}</h1>
                    <p className="mt-5 text-lg leading-8 text-muted-foreground">{id ? "Akses dokumen dan perkembangan layanan Anda melalui portal klien CAL. Tim kami mengelola operasional melalui portal staf." : "Our team manages CRM, accounting, tax, and operational work in ERPNext. Clients use the CAL portal for access and service requests."}</p>
                </div>
                <div className="mt-12 grid gap-6 md:grid-cols-2">
                    <section className="soft-panel rounded-[24px] p-7 sm:p-9">
                        <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-accent-muted text-accent"><BriefcaseBusiness className="h-6 w-6" /></div>
                        <h2 className="mt-5 font-serif text-2xl text-foreground">{id ? "CRM & operasional ERPNext" : "ERPNext CRM & operations"}</h2>
                        <p className="mt-3 leading-7 text-muted-foreground">{id ? "Untuk staf CAL. Masuk ke ERPNext untuk mengelola CRM, akuntansi, perpajakan, proyek, dan operasional klien." : "For CAL staff. Sign in to ERPNext to manage leads, CRM, accounting, tax work, projects, and client operations."}</p>
                        <a href={staffPortalUrl} className={buttonVariants({ variant: "light", className: "mt-6 w-full gap-2 whitespace-normal" })}>
                            {id ? "Buka portal staf ERPNext" : "Open ERPNext staff portal"} <ArrowRight className="h-4 w-4" />
                        </a>
                        <a href={getStaffDeskUrl("crm")} className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
                            {id ? "Langsung ke CRM ERPNext" : "Go directly to ERPNext CRM"} <ArrowRight className="h-4 w-4" />
                        </a>
                    </section>
                    <section className="soft-panel rounded-[24px] p-7 sm:p-9">
                        <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-accent-muted text-accent"><UsersRound className="h-6 w-6" /></div>
                        <h2 className="mt-5 font-serif text-2xl text-foreground">{id ? "Portal klien" : "Client portal"}</h2>
                        <p className="mt-3 leading-7 text-muted-foreground">{id ? "Untuk klien aktif. Akses dokumen bersama, perkembangan layanan, dan informasi akun Anda." : "For existing clients. Access your shared documents, service updates, and client-facing information."}</p>
                        <Link href="/sign-in" className={buttonVariants({ variant: "accent", className: "mt-6 w-full gap-2" })}>
                            {id ? "Masuk sebagai klien" : "Client sign in"} <LogIn className="h-4 w-4" />
                        </Link>
                        <p className="mt-5 text-sm text-muted-foreground">{id ? "Baru mengenal CAL?" : "New to CAL?"}</p>
                        <Link href="/crm/register" className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">{id ? "Ajukan layanan" : "Send a service request"} <ArrowRight className="h-4 w-4" /></Link>
                    </section>
                </div>
            </main>
            <Footer />
        </div>
    );
}
