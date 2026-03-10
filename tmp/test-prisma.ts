import { prisma } from "../src/lib/prisma";

async function main() {
    try {
        console.log("Checking Prisma Models...");
        console.log("Account model:", !!prisma.account);
        console.log("JournalEntry model:", !!prisma.journalEntry);

        const accounts = await prisma.account.findMany({ take: 1 });
        console.log("Successfully queried accounts:", accounts.length);
    } catch (error) {
        console.error("Prisma check failed:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
