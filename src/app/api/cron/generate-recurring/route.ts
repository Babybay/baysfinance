import { NextResponse } from "next/server";
import { generateRecurringInvoices } from "@/app/actions/recurring-invoices";

export async function GET(request: Request) {
    // Authorization — always require CRON_SECRET
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization");
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const { generated, failed } = await generateRecurringInvoices();

        return NextResponse.json({
            success: true,
            generated,
            failed,
            message: `Generated ${generated} invoice(s)${failed > 0 ? `, ${failed} failed` : ""}.`,
        });
    } catch (error) {
        console.error("Failed to generate recurring invoices:", error);
        return NextResponse.json(
            { success: false, error: "Failed to generate recurring invoices" },
            { status: 500 }
        );
    }
}
