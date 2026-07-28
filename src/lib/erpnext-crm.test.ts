import { describe, expect, it } from "vitest";
import {
    buildErpNextLead,
    buildErpNextLeadComment,
    getErpNextLeadEndpoint,
    validateCrmRegistration,
} from "./erpnext-crm";

describe("validateCrmRegistration", () => {
    it("normalizes a complete website CRM registration", () => {
        expect(validateCrmRegistration({
            fullName: "  Rani Putri  ",
            email: "RANI@EXAMPLE.COM ",
            phone: " 0812-3456-7890 ",
            companyName: " PT Sinar Baru ",
            serviceInterest: "Company establishment",
        })).toEqual({
            fullName: "Rani Putri",
            email: "rani@example.com",
            phone: "0812-3456-7890",
            companyName: "PT Sinar Baru",
            serviceInterest: "Company establishment",
        });
    });

    it("rejects a registration without a valid email", () => {
        expect(() => validateCrmRegistration({
            fullName: "Rani Putri",
            email: "not-an-email",
            phone: "0812-3456-7890",
            companyName: "PT Sinar Baru",
            serviceInterest: "Tax consulting",
        })).toThrow("valid email");
    });

    it("rejects unsupported services and oversized field values", () => {
        expect(() => validateCrmRegistration({
            fullName: "Rani Putri",
            email: "rani@example.com",
            phone: "0812-3456-7890",
            companyName: "PT Sinar Baru",
            serviceInterest: "Custom script injection",
        })).toThrow("supported service");

        expect(() => validateCrmRegistration({
            fullName: "A".repeat(121),
            email: "rani@example.com",
            phone: "0812-3456-7890",
            companyName: "PT Sinar Baru",
            serviceInterest: "Tax consulting",
        })).toThrow("too long");
    });
});

describe("buildErpNextLead", () => {
    it("maps a website registration to standard ERPNext Lead fields", () => {
        const registration = validateCrmRegistration({
            fullName: "Rani Putri",
            email: "rani@example.com",
            phone: "0812-3456-7890",
            companyName: "PT Sinar Baru",
            serviceInterest: "Tax consulting",
        });

        expect(buildErpNextLead(registration)).toEqual({
            lead_name: "Rani Putri",
            email_id: "rani@example.com",
            mobile_no: "0812-3456-7890",
            company_name: "PT Sinar Baru",
        });
    });
});

describe("buildErpNextLeadComment", () => {
    it("keeps the requested service with the newly created ERPNext lead", () => {
        expect(buildErpNextLeadComment("LEAD-0001", "Tax consulting")).toEqual({
            comment_type: "Comment",
            reference_doctype: "Lead",
            reference_name: "LEAD-0001",
            content: "Website service interest: Tax consulting",
        });
    });
});

describe("getErpNextLeadEndpoint", () => {
    it("uses the configured Frappe site origin", () => {
        expect(getErpNextLeadEndpoint("https://thebaysworld.j.frappe.cloud/app/guide"))
            .toBe("https://thebaysworld.j.frappe.cloud/api/resource/Lead");
    });
});
