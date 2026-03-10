import { Client } from 'pg';

async function testInsert() {
    const client = new Client({ connectionString: 'postgresql://postgres:babybay@localhost:5433/consult_app' });
    await client.connect();

    try {
        await client.query(`
            INSERT INTO accounts (id, code, name, type, "isActive", "clientId", "createdAt", "updatedAt") 
            VALUES ('acc123', '1101', 'Kas', 'Asset', true, null, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
        `);
        console.log("Insert success!");
    } catch (e) {
        console.error("Insert failed:", e);
    }

    await client.end();
}

testInsert().catch(console.error);
