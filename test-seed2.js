"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();

async function main() {
    console.log("Testing create account...");
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
        console.log("Success");
    } catch (e) {
        console.error("Error:", e);
    }

    // cleanup
    try {
        await prisma.account.deleteMany({ where: { code: "9999" } });
    } catch { }
}

main().finally(() => prisma.$disconnect());
