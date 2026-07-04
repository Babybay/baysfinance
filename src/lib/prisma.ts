import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
    prisma: ReturnType<typeof createPrismaClient> | undefined
}

const SOFT_DELETE_MODELS = new Set([
    'Client', 'TaxDeadline', 'Document', 'Invoice',
    'PermitCase',
    'RecurringInvoice', 'Account', 'ImportBatch', 'FixedAsset', 'AnnualTaxBatch',
    'Expense'
    // JournalEntry and Payment are intentionally EXCLUDED:
    // Financial records must be immutable — use reversing entries instead of deletion.
])

/**
 * Cascade map: when a parent is soft-deleted, these children should also be soft-deleted.
 * Key = parent model, Value = array of { model, foreignKey } for children with deletedAt.
 */
const SOFT_DELETE_CASCADE: Record<string, { model: string; foreignKey: string }[]> = {
    Client: [
        { model: 'TaxDeadline', foreignKey: 'clientId' },
        { model: 'Document', foreignKey: 'clientId' },
        { model: 'Invoice', foreignKey: 'clientId' },
        { model: 'PermitCase', foreignKey: 'clientId' },
        { model: 'RecurringInvoice', foreignKey: 'clientId' },
        { model: 'Account', foreignKey: 'clientId' },
        { model: 'ImportBatch', foreignKey: 'clientId' },
        { model: 'FixedAsset', foreignKey: 'clientId' },
        { model: 'AnnualTaxBatch', foreignKey: 'clientId' },
        { model: 'Expense', foreignKey: 'clientId' },
        // JournalEntry and Payment are NOT cascaded — they are immutable financial records.
    ],
}

const READ_OPS = new Set(['findUnique', 'findFirst', 'findMany', 'count', 'aggregate', 'groupBy'])

/**
 * Cascade soft-delete to child models.
 * Uses the raw PrismaClient (not extended) to avoid infinite recursion.
 * Caller must invoke this inside a $transaction alongside the parent update
 * so a failure partway through cannot leave children deleted but parent alive.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function cascadeSoftDelete(tx: any, model: string, where: Record<string, unknown>) {
    const cascades = SOFT_DELETE_CASCADE[model]
    if (!cascades) return

    // Resolve the parent IDs that are being deleted
    const parentRecords = await tx[model].findMany({
        where,
        select: { id: true },
    })
    if (parentRecords.length === 0) return

    const parentIds = parentRecords.map((r: { id: string }) => r.id)

    for (const cascade of cascades) {
        const fk = cascade.foreignKey
        await tx[cascade.model].updateMany({
            where: { [fk]: { in: parentIds }, deletedAt: null },
            data: { deletedAt: new Date() },
        })
        // Recurse for nested cascades (e.g., Client → Invoice → Payment)
        await cascadeSoftDelete(tx, cascade.model, { [fk]: { in: parentIds } })
    }
}

function createPrismaClient() {
    const adapter = new PrismaPg({
        connectionString: process.env.DATABASE_URL!,
        // pg defaults: max 10, connectionTimeoutMillis 0 (wait forever).
        // Serverless runs one pool per instance, so keep the pool small and
        // fail fast instead of queueing indefinitely when Postgres is saturated.
        max: Number(process.env.DATABASE_POOL_MAX ?? 5),
        connectionTimeoutMillis: 5_000,
        idleTimeoutMillis: 300_000,
    })
    const client = new PrismaClient({ adapter })

    return client.$extends({
        query: {
            $allModels: {
                async $allOperations({ model, operation, args, query }) {
                    if (!SOFT_DELETE_MODELS.has(model as string)) {
                        return query(args)
                    }

                    // Auto-filter deletedAt for read operations
                    if (READ_OPS.has(operation)) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const a = args as any
                        a.where = { ...a.where, deletedAt: null }
                    }

                    // Convert delete → soft-delete with cascade (atomic: cascade + parent update in one tx)
                    if (operation === 'delete') {
                        return client.$transaction(async (tx) => {
                            await cascadeSoftDelete(tx, model as string, args.where as Record<string, unknown>)
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            return (tx as any)[model].update({
                                where: args.where,
                                data: { deletedAt: new Date() },
                            })
                        })
                    }
                    if (operation === 'deleteMany') {
                        return client.$transaction(async (tx) => {
                            await cascadeSoftDelete(tx, model as string, (args.where ?? {}) as Record<string, unknown>)
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            return (tx as any)[model].updateMany({
                                where: args.where,
                                data: { deletedAt: new Date() },
                            })
                        })
                    }

                    return query(args)
                }
            }
        }
    })
}

export const prisma =
    globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

