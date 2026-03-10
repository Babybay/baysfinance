import { Client } from 'pg';

async function check() {
    const client = new Client({ connectionString: 'postgresql://postgres:babybay@localhost:5433/consult_app' });
    await client.connect();
    const res = await client.query(`
        SELECT column_name, is_nullable, column_default 
        FROM information_schema.columns 
        WHERE table_name = 'accounts';
    `);
    console.table(res.rows);
    await client.end();
}

check().catch(console.error);
