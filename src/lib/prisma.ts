import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
    prisma: ReturnType<typeof createPrismaClient> | undefined
}

const SOFT_DELETE_MODELS = new Set([
    'Client', 'TaxDeadline', 'Document', 'Invoice',
    'PermitCase', 'JournalEntry', 'Payment',
    'RecurringInvoice', 'Account', 'ImportBatch', 'FixedAsset'
])

/**
 * Cascade map: when a parent is soft-deleted, these children should also be soft-deleted.
 * Key = parent model, Value = array of { model, foreignKey } for children with deletedAt.
 */
const SOFT_DELETE_CASCADE: Record<string, { model: string; foreignKey: string }[]> = {
    Client: [
        { model: 'TaxDeadline', foreignKey: 'clientId' },
        { model: 'Document', foreignKey: 'clientId' },
        { model: 'Invoice', foreignKey: 'clientId' },  // Invoice → Payment cascades via nested rule below
        { model: 'PermitCase', foreignKey: 'clientId' },
        { model: 'JournalEntry', foreignKey: 'clientId' },
        { model: 'RecurringInvoice', foreignKey: 'clientId' },
        { model: 'Account', foreignKey: 'clientId' },
        { model: 'ImportBatch', foreignKey: 'clientId' },
        { model: 'FixedAsset', foreignKey: 'clientId' },
    ],
    Invoice: [
        { model: 'Payment', foreignKey: 'invoiceId' },
    ],
}

const READ_OPS = new Set(['findUnique', 'findFirst', 'findMany', 'count', 'aggregate', 'groupBy'])

/**
 * Cascade soft-delete to child models.
 * Uses the raw PrismaClient (not extended) to avoid infinite recursion.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma dynamic model access requires any
async function cascadeSoftDelete(client: PrismaClient, model: string, where: Record<string, unknown>) {
    const cascades = SOFT_DELETE_CASCADE[model]
    if (!cascades) return

    // Resolve the parent IDs that are being deleted
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parentRecords = await (client as any)[model].findMany({
        where,
        select: { id: true },
    })
    if (parentRecords.length === 0) return

    const parentIds = parentRecords.map((r: { id: string }) => r.id)

    for (const cascade of cascades) {
        const fk = cascade.foreignKey
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (client as any)[cascade.model].updateMany({
            where: { [fk]: { in: parentIds }, deletedAt: null },
            data: { deletedAt: new Date() },
        })
        // Recurse for nested cascades (e.g., Client → Invoice → Payment)
        await cascadeSoftDelete(client, cascade.model, { [fk]: { in: parentIds } })
    }
}

function createPrismaClient() {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
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

                    // Convert delete → soft-delete with cascade
                    if (operation === 'delete') {
                        await cascadeSoftDelete(client, model as string, args.where as Record<string, unknown>)
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        return (client as any)[model].update({
                            where: args.where,
                            data: { deletedAt: new Date() },
                        })
                    }
                    if (operation === 'deleteMany') {
                        await cascadeSoftDelete(client, model as string, (args.where ?? {}) as Record<string, unknown>)
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        return (client as any)[model].updateMany({
                            where: args.where,
                            data: { deletedAt: new Date() },
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

