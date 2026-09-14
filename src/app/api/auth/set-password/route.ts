import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    const { token, password } = await req.json() as { token?: unknown; password?: unknown };
    if (typeof token !== "string" || token.length < 32 || token.length > 128
        || typeof password !== "string" || password.length < 12 || password.length > 128) {
        return new NextResponse("Invalid invitation or password", { status: 400 });
    }

    const inviteTokenHash = createHash("sha256").update(token).digest("hex");
    const user = await prisma.user.findFirst({
        where: { inviteTokenHash, inviteExpiresAt: { gt: new Date() }, isActive: true },
        select: { id: true },
    });
    if (!user) return new NextResponse("Invitation is invalid or expired", { status: 400 });

    await prisma.user.update({
        where: { id: user.id },
        data: {
            passwordHash: await bcrypt.hash(password, 12),
            inviteTokenHash: null,
            inviteExpiresAt: null,
        },
    });

    return NextResponse.json({ success: true });
}
