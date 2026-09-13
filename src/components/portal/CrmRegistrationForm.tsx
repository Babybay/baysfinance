"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { registerCrmLead } from "@/app/actions/crm";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CRM_SERVICE_INTERESTS } from "@/lib/erpnext-crm";
import { useI18n } from "@/lib/i18n";

type FormStatus = { type: "error" | "success"; message: string; reference?: string };

export function CrmRegistrationForm() {
    const { locale } = useI18n();
    const id = locale === "id";
    const [status, setStatus] = useState<FormStatus | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const serviceLabels = id ? ["Konsultasi pajak", "Layanan akuntansi", "Pendirian perusahaan", "Perizinan usaha", "Konsultasi lainnya"] : CRM_SERVICE_INTERESTS;

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (submitting) return;
        const formData = new FormData(event.currentTarget);
        setSubmitting(true);
        setStatus(null);
        try {
            const result = await registerCrmLead({
                fullName: String(formData.get("fullName") ?? ""),
                email: String(formData.get("email") ?? ""),
                phone: String(formData.get("phone") ?? ""),
                companyName: String(formData.get("companyName") ?? ""),
                serviceInterest: String(formData.get("serviceInterest") ?? ""),
                website: String(formData.get("website") ?? ""),
            });
            if (result.success) {
                setStatus({ type: "success", reference: result.reference, message: result.notice ?? (id ? "Permintaan Anda sudah diterima. Konsultan kami akan meninjau kebutuhan Anda dan menghubungi Anda untuk langkah berikutnya." : "Your request has been received. A consultant will review your needs and contact you about the next step.") });
            } else {
                setStatus({ type: "error", message: result.error });
            }
        } catch {
            setStatus({ type: "error", message: id ? "Koneksi terputus. Periksa koneksi Anda dan coba lagi." : "We couldn’t connect. Please check your connection and try again." });
        } finally {
            setSubmitting(false);
        }
    }

    if (status?.type === "success") return (
        <section className="rounded-2xl border border-border bg-card p-7 sm:p-9" aria-live="polite">
            <CheckCircle2 className="h-10 w-10 text-accent" />
            <h1 className="mt-5 font-serif text-3xl">{id ? "Terima kasih. Mari mulai." : "Thank you. Let’s get started."}</h1>
            <p className="mt-4 text-sm leading-7 text-muted">{status.message}</p>
            {status.reference && <div className="mt-6 rounded-xl bg-surface p-4"><p className="text-xs text-muted">{id ? "Nomor referensi permintaan" : "Your request reference"}</p><p className="mt-2 font-mono text-sm font-medium" data-request-reference>{status.reference}</p></div>}
            <Link href="/portal" className={buttonVariants({ variant: "accent", className: "mt-7 gap-2" })}>{id ? "Kembali ke portal" : "Back to portals"}<ArrowRight className="h-4 w-4" /></Link>
        </section>
    );

    return (
        <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8" aria-busy={submitting}>
            <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[.15em] text-accent">{id ? "Konsultasi bersama CAL" : "Consult with CAL"}</p>
                <h1 className="font-serif text-3xl text-foreground">{id ? "Ceritakan kebutuhan bisnis Anda." : "Tell us about your business."}</h1>
                <p className="mt-3 text-sm leading-6 text-muted">{id ? "Pilih layanan yang Anda butuhkan. Tim kami akan meninjau permintaan Anda melalui ERPNext dan mengatur langkah berikutnya." : "Choose the support you need. Our team will review your request in ERPNext and arrange the next step."}</p>
            </div>
            {status && <div role="alert" className="rounded-xl border border-error/30 bg-error-muted p-3 text-sm text-error">{status.message}</div>}
            <input name="website" tabIndex={-1} autoComplete="off" className="sr-only" aria-hidden="true" />
            <fieldset disabled={submitting} className="space-y-4 disabled:opacity-70">
                <Input label={id ? "Nama lengkap" : "Full name"} name="fullName" required maxLength={120} autoComplete="name" placeholder={id ? "Nama lengkap Anda" : "Your full name"} />
                <Input label={id ? "Email bisnis" : "Business email"} name="email" type="email" required maxLength={254} autoComplete="email" placeholder="name@company.com" />
                <Input label={id ? "Telepon / WhatsApp" : "Phone / WhatsApp"} name="phone" type="tel" required maxLength={40} autoComplete="tel" placeholder="0812-3456-7890" />
                <Input label={id ? "Nama perusahaan" : "Company name"} name="companyName" required maxLength={160} autoComplete="organization" placeholder="PT Example Indonesia" />
                <label className="block space-y-1.5">
                    <span className="text-sm font-medium text-foreground">{id ? "Layanan yang dibutuhkan" : "How can we help?"}</span>
                    <select name="serviceInterest" required defaultValue="" className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40">
                        <option value="" disabled>{id ? "Pilih layanan" : "Select a service"}</option>
                        {CRM_SERVICE_INTERESTS.map((service, index) => <option key={service} value={service}>{serviceLabels[index]}</option>)}
                    </select>
                </label>
            </fieldset>
            <Button type="submit" variant="accent" className="w-full gap-2" disabled={submitting} isLoading={submitting}>{submitting ? (id ? "Mengirim permintaan..." : "Sending request...") : (id ? "Ajukan konsultasi" : "Request consultation")}{!submitting && <ArrowRight className="h-4 w-4" />}</Button>
            <p className="text-xs leading-5 text-muted">{id ? "Informasi ini digunakan untuk menanggapi permintaan Anda. Jangan sertakan NPWP, detail rekening, atau dokumen identitas di formulir ini." : "We use this information to respond to your request. Do not include tax IDs, bank details, or identity documents in this form."}</p>
        </form>
    );
}
