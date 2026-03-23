import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TaxDeadlineStatus } from "@prisma/client";

export async function GET(request: Request) {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization");
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const now = new Date();

        const updated = await prisma.taxDeadline.updateMany({
            where: {
                status: TaxDeadlineStatus.BelumLapor,
                tanggalBatas: { lt: now },
            },
            data: {
                status: TaxDeadlineStatus.Terlambat,
            },
        });

        return NextResponse.json({
            success: true,
            message: `Updated ${updated.count} overdue deadline(s) to Terlambat.`,
        });
    } catch (error) {
        console.error("Failed to check deadlines:", error);
        return NextResponse.json(
            { success: false, error: "Failed to check deadlines" },
            { status: 500 }
        );
    }
}
