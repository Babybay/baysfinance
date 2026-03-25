import { Prisma } from "@prisma/client";

/**
 * Updates the materialized AccountBalance cache within a transaction.
 * Called after journal entries are posted.
 *
 * Uses upsert with atomic increment to stay consistent under concurrency.
 */
export async function updateAccountBalances(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tx: any,
    clientId: string,
    items: { accountId: string; debit: number; credit: number }[],
    mode: "add" | "subtract" = "add",
): Promise<void> {
    const sign = mode === "add" ? 1 : -1;

    for (const item of items) {
        const debitDelta = item.debit * sign;
        const creditDelta = item.credit * sign;
        const balanceDelta = (item.debit - item.credit) * sign;

        await tx.$queryRaw(
            Prisma.sql`
                INSERT INTO account_balances (id, "clientId", "accountId", "debitTotal", "creditTotal", balance, "updatedAt")
                VALUES (gen_random_uuid()::text, ${clientId}, ${item.accountId}, ${debitDelta}, ${creditDelta}, ${balanceDelta}, NOW())
                ON CONFLICT ("clientId", "accountId") DO UPDATE SET
                    "debitTotal" = account_balances."debitTotal" + ${debitDelta},
                    "creditTotal" = account_balances."creditTotal" + ${creditDelta},
                    balance = account_balances.balance + ${balanceDelta},
                    "updatedAt" = NOW()
            `
        );
    }
}
