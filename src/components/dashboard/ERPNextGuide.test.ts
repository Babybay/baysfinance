import { describe, expect, it } from "vitest";
import { getTrainingModules } from "./ERPNextGuide";

describe("staff training modules", () => {
    it("gives general and accounting staff short role-specific paths", () => {
        const general = getTrainingModules("id", "general");
        const accounting = getTrainingModules("id", "accounting");

        expect(general).toHaveLength(6);
        expect(accounting).toHaveLength(6);
        expect(general.some((module) => module.id === "general-request")).toBe(true);
        expect(accounting.some((module) => module.id === "accounting-draft")).toBe(true);
        expect(accounting.find((module) => module.id === "accounting-draft")?.steps.join(" ")).toContain("Jangan Submit");
    });
});
