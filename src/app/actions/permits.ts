"use server";

import { prisma } from "@/lib/prisma";

// ─── PERMIT TYPES ────────────────────────────────────────────────────────────

export async function getPermitTypes() {
    try {
        const types = await prisma.permitType.findMany({
            include: {
                requiredDocs: { orderBy: { sortOrder: "asc" } },
                checklistItems: { orderBy: { sortOrder: "asc" } },
            },
        });
        return { success: true, data: types };
    } catch (error) {
        console.error("getPermitTypes error:", error);
        return { success: false, data: [] };
    }
}

export async function getPermitTypeBySlug(slug: string) {
    try {
        const type = await prisma.permitType.findUnique({
            where: { slug },
            include: {
                requiredDocs: { orderBy: { sortOrder: "asc" } },
                checklistItems: { orderBy: { sortOrder: "asc" } },
            },
        });
        return { success: true, data: type };
    } catch (error) {
        console.error("getPermitTypeBySlug error:", error);
        return { success: false, data: null };
    }
}

// ─── AUTO-GENERATE CASE ID ───────────────────────────────────────────────────

async function generateCaseId(prefix: string): Promise<string> {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const counterId = `${prefix}-${yyyy}-${mm}`;

    // Atomically increment the counter using upsert
    const counter = await prisma.permitCounter.upsert({
        where: { id: counterId },
        update: { counter: { increment: 1 } },
        create: { id: counterId, counter: 1 },
    });

    const seq = String(counter.counter).padStart(4, "0");
    return `${prefix}-${yyyy}-${mm}-${seq}`;
}

// ─── PERMIT CASES ────────────────────────────────────────────────────────────

export async function getPermits(clientId?: string, permitTypeId?: string) {
    try {
        const permits = await prisma.permitCase.findMany({
            where: {
                ...(clientId ? { clientId } : {}),
                ...(permitTypeId ? { permitTypeId } : {}),
            },
            include: {
                permitType: true,
            },
            orderBy: { updatedAt: "desc" },
        });
        return { success: true, data: permits };
    } catch (error) {
        console.error("getPermits error:", error);
        return { success: false, data: [] };
    }
}

export async function getPermitById(id: string) {
    try {
        const permit = await prisma.permitCase.findUnique({
            where: { id },
            include: {
                permitType: true,
                documents: { orderBy: { sortOrder: "asc" } },
                checklists: { orderBy: { sortOrder: "asc" } },
            },
        });
        return { success: true, data: permit };
    } catch (error) {
        console.error("getPermitById error:", error);
        return { success: false, data: null };
    }
}

export async function createPermitCase(data: {
    permitTypeId: string;
    clientId: string;
    clientName: string;
    advisorId?: string;
    serviceType: string;
    riskCategory: string;
    feeAmount: number;
    notes?: string;
}) {
    try {
        // Fetch the permit type with its templates
        const permitType = await prisma.permitType.findUnique({
            where: { id: data.permitTypeId },
            include: {
                requiredDocs: { orderBy: { sortOrder: "asc" } },
                checklistItems: { orderBy: { sortOrder: "asc" } },
            },
        });

        if (!permitType) {
            return { success: false, error: "Jenis perijinan tidak ditemukan" };
        }

        // Generate case ID
        const caseId = await generateCaseId(permitType.caseIdPrefix);

        // Create the case with auto-generated documents and checklists
        const permit = await prisma.permitCase.create({
            data: {
                caseId,
                permitTypeId: data.permitTypeId,
                clientId: data.clientId,
                clientName: data.clientName,
                advisorId: data.advisorId || "",
                serviceType: data.serviceType,
                riskCategory: data.riskCategory,
                status: "Draft",
                progress: 0,
                feeAmount: data.feeAmount,
                notes: data.notes,
                // Auto-generate required documents from template
                documents: {
                    create: permitType.requiredDocs.map((doc, idx) => ({
                        docType: doc.docType,
                        verificationStatus: "Pending",
                        sortOrder: idx,
                    })),
                },
                // Auto-generate checklist items from template
                checklists: {
                    create: permitType.checklistItems.map((item, idx) => ({
                        label: item.label,
                        description: item.description,
                        isChecked: false,
                        sortOrder: idx,
                    })),
                },
            },
            include: {
                permitType: true,
                documents: true,
                checklists: true,
            },
        });

        return { success: true, data: permit };
    } catch (error) {
        console.error("createPermitCase error:", error);
        return { success: false, error: "Gagal membuat pengajuan perijinan" };
    }
}

// ─── UPDATE STATUS ───────────────────────────────────────────────────────────

export async function updatePermitStatus(id: string, status: string, progress: number) {
    try {
        const permit = await prisma.permitCase.update({
            where: { id },
            data: { status, progress },
        });
        return { success: true, data: permit };
    } catch (error) {
        console.error("updatePermitStatus error:", error);
        return { success: false, error: "Gagal mengupdate status perijinan" };
    }
}

// ─── DOCUMENT VERIFICATION ──────────────────────────────────────────────────

export async function verifyDocument(id: string, status: string, comments: string | null) {
    try {
        const document = await prisma.permitDocument.update({
            where: { id },
            data: {
                verificationStatus: status,
                comments: comments,
            },
        });
        return { success: true, data: document };
    } catch (error) {
        console.error("verifyDocument error:", error);
        return { success: false, error: "Gagal memverifikasi dokumen" };
    }
}

export async function updatePermitDocument(id: string, fileUrl: string) {
    try {
        const document = await prisma.permitDocument.update({
            where: { id },
            data: {
                fileUrl,
                verificationStatus: "Pending",
                comments: null,
            },
        });
        return { success: true, data: document };
    } catch (error) {
        console.error("updatePermitDocument error:", error);
        return { success: false, error: "Gagal mengupdate dokumen" };
    }
}

// ─── CHECKLIST / SIGNATURE ──────────────────────────────────────────────────

export async function updateChecklistItem(id: string, isChecked: boolean, userId?: string) {
    try {
        const item = await prisma.permitChecklist.update({
            where: { id },
            data: {
                isChecked,
                checkedAt: isChecked ? new Date() : null,
                checkedBy: isChecked ? (userId || null) : null,
            },
        });
        return { success: true, data: item };
    } catch (error) {
        console.error("updateChecklistItem error:", error);
        return { success: false, error: "Gagal mengupdate checklist" };
    }
}
