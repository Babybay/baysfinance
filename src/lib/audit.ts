import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

interface AuditLogInput {
    action: string;
    model: string;
    recordId: string;
    clientId?: string;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
}

/**
 * Writes an audit log entry for a sensitive operation.
 * Silently fails — audit logging should never break business logic.
 */
export async function writeAuditLog(input: AuditLogInput): Promise<void> {
    try {
        const user = await getCurrentUser();
        if (!user) return;

        await prisma.auditLog.create({
            data: {
                action: input.action,
                model: input.model,
                recordId: input.recordId,
                userId: user.id,
                userName: user.name,
                clientId: input.clientId,
                before: input.before ?? undefined,
                after: input.after ?? undefined,
                metadata: input.metadata ?? undefined,
            },
        });
    } catch (err) {
        console.error("[audit] Failed to write audit log:", err);
    }
}
