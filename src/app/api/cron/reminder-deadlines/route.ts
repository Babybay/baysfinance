import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TaxDeadlineStatus } from "@prisma/client";
import { filterAndLogNew } from "@/lib/notifications";
import { createLogger } from "@/lib/logger";

const log = createLogger("cron:reminder-deadlines");

/**
 * Returns upcoming tax deadlines that haven't been reminded yet.
 * Checks for H-3 (3 days before) and H-1 (1 day before) deadlines.
 *
 * n8n calls this on a daily schedule, gets the list, and sends
 * email/WhatsApp/Telegram to each client.
 *
 * Protected by CRON_SECRET (enforced in proxy.ts).
 */
export async function GET() {
    try {
        const now = new Date();
        const in1Day = new Date(now);
        in1Day.setDate(in1Day.getDate() + 1);
        in1Day.setHours(23, 59, 59, 999);

        const in3Days = new Date(now);
        in3Days.setDate(in3Days.getDate() + 3);
        in3Days.setHours(23, 59, 59, 999);

        // Find deadlines due within the next 3 days that are still BelumLapor
        const upcomingDeadlines = await prisma.taxDeadline.findMany({
            where: {
                status: TaxDeadlineStatus.BelumLapor,
                tanggalBatas: { gt: now, lte: in3Days },
            },
            include: {
                client: { select: { id: true, nama: true, email: true, telepon: true } },
            },
            orderBy: { tanggalBatas: "asc" },
        });

        // Classify each deadline as H-1 or H-3
        const classified = upcomingDeadlines.map((d) => {
            const daysUntil = Math.ceil(
                (d.tanggalBatas.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
            );
            return {
                ...d,
                daysUntil,
                reminderType: daysUntil <= 1 ? ("deadline_h1" as const) : ("deadline_h3" as const),
            };
        });

        // Filter H-1 reminders (not yet notified as H-1)
        const h1Items = classified
            .filter((d) => d.reminderType === "deadline_h1")
            .map((d) => ({
                id: d.id,
                clientId: d.clientId,
                clientName: d.client.nama,
                clientEmail: d.client.email,
                clientPhone: d.client.telepon,
                jenisPajak: d.jenisPajak,
                deskripsi: d.deskripsi,
                masaPajak: d.masaPajak,
                tanggalBatas: d.tanggalBatas.toISOString(),
                daysUntil: d.daysUntil,
            }));

        // Filter H-3 reminders (not yet notified as H-3)
        const h3Items = classified
            .filter((d) => d.reminderType === "deadline_h3")
            .map((d) => ({
                id: d.id,
                clientId: d.clientId,
                clientName: d.client.nama,
                clientEmail: d.client.email,
                clientPhone: d.client.telepon,
                jenisPajak: d.jenisPajak,
                deskripsi: d.deskripsi,
                masaPajak: d.masaPajak,
                tanggalBatas: d.tanggalBatas.toISOString(),
                daysUntil: d.daysUntil,
            }));

        const newH1 = await filterAndLogNew("deadline_h1", h1Items);
        const newH3 = await filterAndLogNew("deadline_h3", h3Items);

        const reminders = [
            ...newH1.map((r) => ({ ...r, urgency: "H-1" })),
            ...newH3.map((r) => ({ ...r, urgency: "H-3" })),
        ];

        log.info(
            { total: reminders.length, h1: newH1.length, h3: newH3.length },
            "Deadline reminders generated",
        );

        return NextResponse.json({
            success: true,
            count: reminders.length,
            reminders,
        });
    } catch (error) {
        log.error({ err: error }, "Failed to generate deadline reminders");
        return NextResponse.json(
            { success: false, error: "Failed to generate deadline reminders" },
            { status: 500 },
        );
    }
}
