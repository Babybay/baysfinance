const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

async function main() {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    const prisma = new PrismaClient({ adapter });

    console.log("Connecting...");
    try {
        await prisma.account.create({
            data: {
                code: "9999",
                name: "Test",
                type: "Asset",
                clientId: null,
                isActive: true
            }
        });
        console.log("Success!");
    } catch (e) {
        console.error("Prisma create error:", e);
    }

    await prisma.$disconnect();
}
main();
