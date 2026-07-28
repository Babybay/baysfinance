"use server";

import "server-only";
import {
    buildErpNextLead,
    buildErpNextLeadComment,
    getErpNextLeadEndpoint,
    validateCrmRegistration,
    type CrmRegistration,
} from "@/lib/erpnext-crm";
import { crmEmailLimiter, crmGlobalLimiter } from "@/lib/rate-limit";

type ActionResult = { success: true; notice?: string } | { success: false; error: string };
type CrmRegistrationRequest = CrmRegistration & { website?: string };

function getErpNextCredentials() {
    const url = process.env.ERPNEXT_URL?.trim();
    const apiKey = process.env.ERPNEXT_API_KEY?.trim();
    const apiSecret = process.env.ERPNEXT_API_SECRET?.trim();

    return url && apiKey && apiSecret ? { url, apiKey, apiSecret } : null;
}

export async function registerCrmLead(input: CrmRegistrationRequest): Promise<ActionResult> {
    if (input.website?.trim()) {
        return { success: true };
    }

    const credentials = getErpNextCredentials();
    if (!credentials) {
        return {
            success: false,
            error: "CRM registration is temporarily unavailable. Please contact our team directly.",
        };
    }

    try {
        const registration = validateCrmRegistration(input);
        const globalLimit = await crmGlobalLimiter.check("public");
        const emailLimit = await crmEmailLimiter.check(registration.email);
        if (!globalLimit.success || !emailLimit.success) {
            return { success: false, error: "Too many requests. Please try again in a few minutes." };
        }

        const authorization = `token ${credentials.apiKey}:${credentials.apiSecret}`;
        const leadResponse = await fetch(getErpNextLeadEndpoint(credentials.url), {
            method: "POST",
            headers: {
                Authorization: authorization,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(buildErpNextLead(registration)),
            cache: "no-store",
        });

        if (!leadResponse.ok) {
            console.error(`[crm] ERPNext Lead creation failed with status ${leadResponse.status}`);
            return { success: false, error: "We could not submit your request. Please try again shortly." };
        }

        const leadResult = await leadResponse.json() as { data?: { name?: unknown } };
        const leadName = leadResult.data?.name;
        if (typeof leadName !== "string" || !leadName) {
            console.error("[crm] ERPNext Lead creation returned no Lead name");
            return { success: true, notice: "We received your request. Our team will confirm the service details shortly." };
        }

        const commentResponse = await fetch(new URL("/api/resource/Comment", new URL(credentials.url).origin), {
            method: "POST",
            headers: {
                Authorization: authorization,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(buildErpNextLeadComment(leadName, registration.serviceInterest)),
            cache: "no-store",
        });

        if (!commentResponse.ok) {
            console.error(`[crm] ERPNext Lead comment creation failed with status ${commentResponse.status}`);
            return { success: true, notice: "We received your request. Our team will confirm the service details shortly." };
        }

        return { success: true };
    } catch (error) {
        if (error instanceof Error && /required|valid email|too long|supported service/.test(error.message)) {
            return { success: false, error: error.message };
        }

        console.error("[crm] Website CRM registration failed");
        return { success: false, error: "We could not submit your request. Please try again shortly." };
    }
}
