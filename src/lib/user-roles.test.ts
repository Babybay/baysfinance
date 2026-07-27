import { describe, expect, it } from "vitest";
import { isAdminOrStaffRole } from "./user-roles";

describe("isAdminOrStaffRole", () => {
    it("accepts staff and admin roles regardless of session casing", () => {
        expect(isAdminOrStaffRole("Admin")).toBe(true);
        expect(isAdminOrStaffRole("staff")).toBe(true);
    });

    it("rejects client and missing roles", () => {
        expect(isAdminOrStaffRole("Client")).toBe(false);
        expect(isAdminOrStaffRole(undefined)).toBe(false);
    });
});
