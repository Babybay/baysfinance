import { NextResponse } from "next/server";
import { seedAccounts } from "@/app/actions/seed-accounts";

export async function GET() {
    try {
        const result = await seedAccounts();
        return NextResponse.json(result);
    } catch (e: any) {
        return NextResponse.json({ error: String(e), meta: e?.meta }, { status: 500 });
    }
}
