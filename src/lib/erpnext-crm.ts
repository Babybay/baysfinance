export type CrmRegistration = {
    fullName: string;
    email: string;
    phone: string;
    companyName: string;
    serviceInterest: string;
};

export const CRM_SERVICE_INTERESTS = [
    "Tax consulting",
    "Accounting services",
    "Company establishment",
    "Business permits",
    "Other consultation",
] as const;

export type ErpNextLead = {
    lead_name: string;
    email_id: string;
    mobile_no: string;
    company_name: string;
};

export type ErpNextLeadComment = {
    comment_type: "Comment";
    reference_doctype: "Lead";
    reference_name: string;
    content: string;
};

function requiredString(value: unknown, field: string, maxLength: number): string {
    if (typeof value !== "string" || !value.trim()) {
        throw new Error(`${field} is required`);
    }

    const normalized = value.trim();
    if (normalized.length > maxLength) {
        throw new Error(`${field} is too long`);
    }

    return normalized;
}

export function validateCrmRegistration(input: CrmRegistration): CrmRegistration {
    const email = requiredString(input.email, "Email", 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("A valid email is required");
    }

    const serviceInterest = requiredString(input.serviceInterest, "Service interest", 64);
    if (!CRM_SERVICE_INTERESTS.includes(serviceInterest as (typeof CRM_SERVICE_INTERESTS)[number])) {
        throw new Error("Please select a supported service");
    }

    return {
        fullName: requiredString(input.fullName, "Full name", 120),
        email,
        phone: requiredString(input.phone, "Phone", 40),
        companyName: requiredString(input.companyName, "Company name", 160),
        serviceInterest,
    };
}

export function buildErpNextLead(registration: CrmRegistration): ErpNextLead {
    return {
        lead_name: registration.fullName,
        email_id: registration.email,
        mobile_no: registration.phone,
        company_name: registration.companyName,
    };
}

export function buildErpNextLeadComment(leadName: string, serviceInterest: string): ErpNextLeadComment {
    return {
        comment_type: "Comment",
        reference_doctype: "Lead",
        reference_name: leadName,
        content: `Website service interest: ${serviceInterest}`,
    };
}

export function getErpNextLeadEndpoint(siteUrl: string): string {
    return new URL("/api/resource/Lead", new URL(siteUrl).origin).toString();
}
