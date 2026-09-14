import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";

async function requireAdmin() {
    const user = await getCurrentUser();
    return user?.role === Role.Admin ? user : null;
}

export async function GET() {
    try {
        const currentUser = await requireAdmin();
        if (!currentUser) {
            return new NextResponse("Unauthorized", { status: 403 });
        }

        const users = await prisma.user.findMany({
            where: currentUser.organisationId ? { organisationId: currentUser.organisationId } : undefined,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                clientId: true,
                organisationId: true,
                isActive: true,
                createdAt: true,
            },
            orderBy: { createdAt: "desc" },
        });

        const mapped = users.map((u) => ({
            id: u.id,
            firstName: u.name.split(" ")[0] || u.name,
            lastName: u.name.split(" ").slice(1).join(" ") || "",
            email: u.email,
            role: u.role.toLowerCase(),
            clientId: u.clientId,
            isActive: u.isActive,
        }));

        return NextResponse.json(mapped);
    } catch (error) {
        console.error("[USERS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const currentUser = await requireAdmin();
        if (!currentUser) {
            return new NextResponse("Unauthorized", { status: 403 });
        }

        const body = await req.json();
        const { userId, role, clientId, name, email, password, isActive } = body;

        if (!userId) {
            return new NextResponse("Missing userId", { status: 400 });
        }

        const targetUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { organisationId: true, role: true },
        });
        if (!targetUser) {
            return new NextResponse("User not found", { status: 404 });
        }
        if (currentUser.organisationId && targetUser.organisationId !== currentUser.organisationId) {
            return new NextResponse("Unauthorized", { status: 403 });
        }

        const isSelf = userId === currentUser.id;
        if (isSelf && typeof isActive === "boolean" && !isActive) {
            return new NextResponse("Cannot deactivate your own account", { status: 400 });
        }
        if (isSelf && role && role.toLowerCase() !== "admin" && currentUser.role === "Admin") {
            const remainingAdmins = await prisma.user.count({
                where: {
                    role: Role.Admin,
                    id: { not: userId },
                    ...(currentUser.organisationId ? { organisationId: currentUser.organisationId } : {}),
                },
            });
            if (remainingAdmins === 0) {
                return new NextResponse("Cannot remove the last Admin", { status: 400 });
            }
        }

        const updateData: Record<string, unknown> = {};

        if (role) {
            const roleMap: Record<string, Role> = { admin: Role.Admin, staff: Role.Staff, client: Role.Client };
            const nextRole = roleMap[role.toLowerCase()];
            if (!nextRole) return new NextResponse("Invalid role", { status: 400 });
            if (nextRole === Role.Client && !clientId) return new NextResponse("Client is required", { status: 400 });
            updateData.role = nextRole;
            updateData.clientId = role.toLowerCase() === "client" ? (clientId || null) : null;
            updateData.organisationId = currentUser.organisationId ?? null;

            if (role.toLowerCase() === "client" && clientId && currentUser.organisationId) {
                const client = await prisma.client.findUnique({
                    where: { id: clientId },
                    select: { organisationId: true },
                });
                if (!client || client.organisationId !== currentUser.organisationId) {
                    return new NextResponse("Invalid sub-account", { status: 400 });
                }
            }
        }

        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (typeof isActive === "boolean") updateData.isActive = isActive;
        if (password) {
            if (typeof password !== "string" || password.length < 8) {
                return new NextResponse("Password must be at least 8 characters", { status: 400 });
            }
            updateData.passwordHash = await bcrypt.hash(password, 12);
        }

        await prisma.user.update({
            where: { id: userId },
            data: updateData,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[USERS_PATCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const currentUser = await requireAdmin();
        if (!currentUser) {
            return new NextResponse("Unauthorized", { status: 403 });
        }

        const body = await req.json();
        const { name, email, clientId } = body;

        if (typeof name !== "string" || !name.trim() || name.length > 120
            || typeof email !== "string" || !email.trim() || email.length > 254
            || typeof clientId !== "string" || !clientId) {
            return new NextResponse("Missing required fields", { status: 400 });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return new NextResponse("Invalid email", { status: 400 });
        }
        const client = await prisma.client.findUnique({
            where: { id: clientId },
            select: { organisationId: true },
        });
        if (!client || (currentUser.organisationId && client.organisationId !== currentUser.organisationId)) {
            return new NextResponse("Invalid sub-account", { status: 400 });
        }

        const inviteToken = randomBytes(32).toString("base64url");
        const inviteTokenHash = createHash("sha256").update(inviteToken).digest("hex");
        const inviteExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
        const setupUrl = new URL("/set-password", req.url);
        setupUrl.hash = inviteToken;
        const normalizedEmail = email.trim().toLowerCase();
        const existing = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            select: { id: true, clientId: true, inviteTokenHash: true },
        });
        if (existing) {
            if (!existing.inviteTokenHash || existing.clientId !== clientId) {
                return new NextResponse("Email already registered", { status: 409 });
            }
            await prisma.user.update({ where: { id: existing.id }, data: { inviteTokenHash, inviteExpiresAt } });
            return NextResponse.json({ success: true, userId: existing.id, setupUrl: setupUrl.toString() });
        }

        const passwordHash = await bcrypt.hash(randomBytes(32).toString("base64url"), 12);

        const user = await prisma.user.create({
            data: {
                name: name.trim(),
                email: normalizedEmail,
                passwordHash,
                role: Role.Client,
                clientId,
                organisationId: currentUser.organisationId ?? null,
                inviteTokenHash,
                inviteExpiresAt,
            },
        });

        return NextResponse.json({ success: true, userId: user.id, setupUrl: setupUrl.toString() });
    } catch (error) {
        console.error("[USERS_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
