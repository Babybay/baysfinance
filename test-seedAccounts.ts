import { seedAccounts } from "./src/app/actions/seed-accounts";

async function main() {
    console.log("Running seedAccounts...");
    const result = await seedAccounts();
    console.log("Result:", result);
}

main().catch(console.error);
