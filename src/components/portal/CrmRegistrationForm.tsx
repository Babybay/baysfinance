"use client";

import { useState } from "react";
import { registerCrmLead } from "@/app/actions/crm";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CRM_SERVICE_INTERESTS } from "@/lib/erpnext-crm";

export function CrmRegistrationForm() {
    const [status, setStatus] = useState<{ type: "error" | "success"; message: string } | null>(null);
    const [submitting, setSubmitting] = useState(false);

    async function onSubmit(formData: FormData) {
        setSubmitting(true);
        setStatus(null);

        const result = await registerCrmLead({
            fullName: String(formData.get("fullName") ?? ""),
            email: String(formData.get("email") ?? ""),
            phone: String(formData.get("phone") ?? ""),
            companyName: String(formData.get("companyName") ?? ""),
            serviceInterest: String(formData.get("serviceInterest") ?? ""),
            website: String(formData.get("website") ?? ""),
        });

        if (result.success) {
            setStatus({
                type: "success",
                message: result.notice ?? "Thank you. Your request is now in our CRM. Our team will contact you shortly.",
            });
        } else {
            setStatus({ type: "error", message: result.error });
        }

        setSubmitting(false);
    }

    return (
        <form action={onSubmit} className="space-y-4 rounded-[16px] border border-border bg-card p-6 shadow-[var(--shadow-color)_0px_2px_8px_0px]">
            <div>
                <h1 className="font-serif text-3xl text-foreground">Start with Bay&apos;s Finance</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Send your request directly to our ERPNext CRM. A consultant will review it and arrange your next step.</p>
            </div>
            {status && (
                <div className={`rounded-[10px] border p-3 text-sm ${status.type === "success" ? "border-success/30 bg-success-muted text-success" : "border-error/30 bg-error-muted text-error"}`}>
                    {status.message}
                </div>
            )}
            <input name="website" tabIndex={-1} autoComplete="off" className="sr-only" aria-hidden="true" />
            <Input label="Full name" name="fullName" required autoComplete="name" placeholder="Your full name" />
            <Input label="Business email" name="email" type="email" required autoComplete="email" placeholder="name@company.com" />
            <Input label="Phone / WhatsApp" name="phone" type="tel" required autoComplete="tel" placeholder="0812-3456-7890" />
            <Input label="Company name" name="companyName" required autoComplete="organization" placeholder="PT Example Indonesia" />
            <label className="block space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">How can we help?</span>
                <select name="serviceInterest" required defaultValue="" className="h-10 w-full rounded-[8px] border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40">
                    <option value="" disabled>Select a service</option>
                    {CRM_SERVICE_INTERESTS.map((service) => <option key={service} value={service}>{service}</option>)}
                </select>
            </label>
            <Button type="submit" variant="accent" className="w-full" disabled={submitting}>
                {submitting ? "Submitting to CRM..." : "Request consultation"}
            </Button>
            <p className="text-xs leading-5 text-muted-foreground">We use this information only to respond to your service request. Do not include tax IDs, bank details, or identity documents in this form.</p>
        </form>
    );
}
