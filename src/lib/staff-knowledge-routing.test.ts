import { readFileSync } from "node:fs";
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
const { getToken } = vi.hoisted(() => ({ getToken: vi.fn() }));
vi.mock("next-auth/jwt", () => ({ getToken }));
import { proxy } from "@/proxy";

describe("staff knowledge navigation", () => {
    it("links the existing staff guide to the operating model", () => {
        const guide = readFileSync("src/components/dashboard/ERPNextGuide.tsx", "utf8");
        expect(guide).toContain('href="/dashboard/erpnext-guide/operating-model"');
    });
    it.each(["Admin", "Staff"])("allows %s to reach the knowledge page", async (role) => {
        getToken.mockResolvedValue({ role });
        const response = await proxy(new NextRequest("http://localhost/dashboard/erpnext-guide/operating-model"));
        expect(response.headers.get("location")).toBeNull();
    });
    it("still redirects other staff dashboard routes to ERPNext", async () => {
        getToken.mockResolvedValue({ role: "Staff" });
        const response = await proxy(new NextRequest("http://localhost/dashboard/clients"));
        expect(response.status).toBe(307);
        expect(response.headers.get("location")).not.toBeNull();
    });
    it("requires a session for the knowledge route", async () => {
        getToken.mockResolvedValue(null);
        const response = await proxy(new NextRequest("http://localhost/dashboard/erpnext-guide/operating-model"));
        expect(response.headers.get("location")).toContain("/sign-in");
    });
});
