import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { InvoiceStatus } from '@prisma/client';

export async function GET(request: Request) {
    // Authorization — always require CRON_SECRET
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const now = new Date();
        const updated = await prisma.invoice.updateMany({
            where: {
                status: InvoiceStatus.Terkirim,
                jatuhTempo: {
                    lt: now
                }
            },
            data: {
                status: InvoiceStatus.JatuhTempo
            }
        });

        return NextResponse.json({
            success: true,
            message: `Successfully updated ${updated.count} overdue invoices.`
        });
    } catch (error) {
        console.error('Failed to update overdue invoices:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update overdue invoices' },
            { status: 500 }
        );
    }
}
