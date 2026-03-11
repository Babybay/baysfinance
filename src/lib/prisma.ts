import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
    prisma: ReturnType<typeof createPrismaClient> | undefined
}

function createPrismaClient() {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
    const client = new PrismaClient({ adapter })

    return client.$extends({
        query: {
            $allModels: {
                async $allOperations({ model, operation, args, query }) {
                    const softDeleteModels = [
                        'Client', 'TaxDeadline', 'Document', 'Invoice',
                        'PermitCase', 'JournalEntry', 'Payment',
                        'RecurringInvoice', 'Account', 'ImportBatch'
                    ];

                    if (softDeleteModels.includes(model as string)) {
                        if (['findUnique', 'findFirst', 'findMany', 'count', 'aggregate', 'groupBy'].includes(operation)) {
                            (args as any).where = { ...(args as any).where, deletedAt: null }
                        }
                        if (operation === 'delete') {
                            return (client as any)[model].update({
                                where: args.where,
                                data: { deletedAt: new Date() }
                            })
                        }
                        if (operation === 'deleteMany') {
                            return (client as any)[model].updateMany({
                                where: args.where,
                                data: { deletedAt: new Date() }
                            })
                        }
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

