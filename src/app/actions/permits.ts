"use server";

import { prisma } from "@/lib/prisma";
import { PermitCaseStatus, VerificationStatus } from "@prisma/client";

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
    applicationData?: any;
    customDocs?: string[];
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
                advisorId: data.advisorId || null,
                serviceType: data.serviceType,
                riskCategory: data.riskCategory,
                status: PermitCaseStatus.Draft,
                feeAmount: data.feeAmount,
                notes: data.notes,
                applicationData: data.applicationData || null,
                // Combine template required docs and custom docs from UI
                documents: {
                    create: [
                        ...permitType.requiredDocs.map((doc, idx) => ({
                            docType: doc.docType,
                            verificationStatus: VerificationStatus.Pending,
                            sortOrder: idx,
                        })),
                        ...(data.customDocs || []).map((docType, idx) => ({
                            docType,
                            verificationStatus: VerificationStatus.Pending,
                            sortOrder: permitType.requiredDocs.length + idx,
                        }))
                    ],
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

export async function updatePermitStatus(id: string, status: PermitCaseStatus) {
    try {
        const permit = await prisma.permitCase.update({
            where: { id },
            data: { status },
        });
        return { success: true, data: permit };
    } catch (error) {
        console.error("updatePermitStatus error:", error);
        return { success: false, error: "Gagal mengupdate status perijinan" };
    }
}

// ─── DOCUMENT VERIFICATION ──────────────────────────────────────────────────

export async function verifyDocument(id: string, status: VerificationStatus, comments: string | null) {
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
                verificationStatus: VerificationStatus.Pending,
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
// ─── NIB AUTOMATION (INTEGRATED) ─────────────────────────────────────────────
import { ossApi, djpApi, dukcapilApi, paymentApi, bsreApi } from "@/lib/nib-api";

export async function automateNIBFlow(id: string) {
    try {
        const permit = await prisma.permitCase.findUnique({
            where: { id },
            include: { checklists: true }
        });

        if (!permit) return { success: false, error: "Data perijinan tidak ditemukan" };

        const appData = (permit.applicationData as any) || {};
        const nik = appData.nik || "3273010101700001";
        const npwp = appData.npwp || "012345678912345";
        const kbli = appData.kbli || "62019"; // Default: Software Dev (Low Risk)

        // 1. Dukcapil Verification
        const dukcapil = await dukcapilApi.verifyNIK(nik, permit.clientName);
        if (!dukcapil.success) return { success: false, error: `Dukcapil: ${dukcapil.message}` };

        // 2. DJP Verification
        const djp = await djpApi.verifyNPWP(npwp);
        if (!djp.success) return { success: false, error: `DJP: ${djp.message}` };

        // 3. OSS KBLI Analysis
        const ossKbli = await ossApi.getKBLI(kbli);
        if (!ossKbli.success) return { success: false, error: "Gagal mengambil data KBLI" };

        const isLowRisk = ossKbli.risk === "RENDAH";

        // Logic check: Only auto-issue if LOW RISK
        if (!isLowRisk) {
            await prisma.permitCase.update({
                where: { id },
                data: {
                    status: PermitCaseStatus.Processing,
                    riskCategory: ossKbli.risk,
                    notes: `Risiko ${ossKbli.risk}. Memerlukan verifikasi manual.`
                }
            });
            return { success: true, message: `Risiko ${ossKbli.risk}. Dialihkan ke jalur verifikasi manual.`, manual: true };
        }

        // 4. Payment (Mock) - for NIB usually free, but let's simulate
        await paymentApi.createCharge(0);

        // 5. OSS Sync
        const ossSync = await ossApi.syncNIB({ id: permit.id, kbli });
        if (!ossSync.success) return { success: false, error: "Gagal sinkronisasi OSS" };

        // 6. Digital Signing
        const signing = await bsreApi.signDocument(`NIB_${ossSync.nib}.pdf`);

        // 7. Update Permit Status to ISSUED
        await prisma.permitCase.update({
            where: { id },
            data: {
                status: PermitCaseStatus.Issued,
                riskCategory: "RENDAH",
                notes: `NIB Berhasil Terbit Otomatis. No NIB: ${ossSync.nib}. TTE oleh BSrE.`,
                applicationData: { ...appData, nib: ossSync.nib, signedUrl: signing.signedUrl }
            }
        });

        return { success: true, message: "NIB berhasil diterbitkan secara otomatis!" };

    } catch (error) {
        console.error("automateNIBFlow error:", error);
        return { success: false, error: "Gagal menjalankan otomasi NIB" };
    }
}
