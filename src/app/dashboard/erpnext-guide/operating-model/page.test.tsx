import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUser } = vi.hoisted(() => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/auth-helpers", () => ({ getCurrentUser }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); } }));

describe("staff operating-model knowledge page", () => {
    beforeEach(() => vi.resetAllMocks());
    it.each(["Admin", "Staff"])("renders Indonesian operating guidance for %s", async (role) => {
        getCurrentUser.mockResolvedValue({ role });
        const { default: Page } = await import("./page");
        const html = renderToStaticMarkup(await Page());
        expect(html).toContain('lang="id"');
        for (const term of ["Customer", "Company", "NextAuth", "Frappe", "SSO", "bengkel", "restoran", "User Permissions", "bukan isolasi"])
            expect(html).toContain(term);
        expect(html).toContain('aria-label="Daftar isi"');
    });
    it.each([null, { role: "Client" }, { role: "unknown" }])("does not render staff knowledge for %j", async (user) => {
        getCurrentUser.mockResolvedValue(user);
        const { default: Page } = await import("./page");
        await expect(Page()).rejects.toThrow(user ? "REDIRECT:/dashboard" : "REDIRECT:/sign-in");
    });
});
