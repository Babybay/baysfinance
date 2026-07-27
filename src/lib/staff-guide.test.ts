import { describe, expect, it } from "vitest";
import { getStaffDeskUrl, getStaffPortalUrl } from "./staff-guide";

describe("getStaffPortalUrl", () => {
    it("uses the configured public portal URL when present", () => {
        expect(getStaffPortalUrl("https://erp.example.test/app/guide")).toBe("https://erp.example.test/app/guide");
    });

    it("falls back to the Frappe Guide workspace", () => {
        expect(getStaffPortalUrl()).toBe("https://thebaysworld.j.frappe.cloud/app/guide");
    });
});

describe("getStaffDeskUrl", () => {
    it("uses the staff portal host for a named ERPNext Desk route", () => {
        expect(getStaffDeskUrl("customer", "https://erp.example.test/app/guide")).toBe("https://erp.example.test/app/customer");
    });

    it("falls back to the configured Frappe host when the portal URL is invalid", () => {
        expect(getStaffDeskUrl("todo", "not a URL")).toBe("https://thebaysworld.j.frappe.cloud/app/todo");
    });
});
