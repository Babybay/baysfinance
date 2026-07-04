import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";

export async function GET() {
    try {
        const currentUser = await getCurrentUser();
        const adminOk = currentUser?.role === "Admin" || currentUser?.role === "Staff";
        if (!adminOk || !currentUser) {
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
        const currentUser = await getCurrentUser();
        const adminOk = currentUser?.role === "Admin" || currentUser?.role === "Staff";
        if (!adminOk || !currentUser) {
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

        // Only Admin can grant/revoke Admin, touch other Admins, or deactivate itself
        const isSelf = userId === currentUser.id;
        if (currentUser.role !== "Admin") {
            if (role && role.toLowerCase() === "admin") {
                return new NextResponse("Only Admin can assign the Admin role", { status: 403 });
            }
            if (targetUser.role === Role.Admin) {
                return new NextResponse("Only Admin can modify an Admin account", { status: 403 });
            }
        }
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
            updateData.role = roleMap[role.toLowerCase()] || Role.Client;
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
        const currentUser = await getCurrentUser();
        const adminOk = currentUser?.role === "Admin" || currentUser?.role === "Staff";
        if (!adminOk || !currentUser) {
            return new NextResponse("Unauthorized", { status: 403 });
        }

        const body = await req.json();
        const { name, email, password, role, clientId } = body;

        if (!name || !email || !password) {
            return new NextResponse("Missing required fields", { status: 400 });
        }
        if (password.length < 8) {
            return new NextResponse("Password must be at least 8 characters", { status: 400 });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return new NextResponse("Invalid email", { status: 400 });
        }

        const roleMap: Record<string, Role> = { admin: Role.Admin, staff: Role.Staff, client: Role.Client };
        const normalizedRole = role?.toLowerCase() || "client";

        if (normalizedRole === "admin" && currentUser.role !== "Admin") {
            return new NextResponse("Only Admin can create Admin accounts", { status: 403 });
        }

        if (normalizedRole === "client" && clientId && currentUser.organisationId) {
            const client = await prisma.client.findUnique({
                where: { id: clientId },
                select: { organisationId: true },
            });
            if (!client || client.organisationId !== currentUser.organisationId) {
                return new NextResponse("Invalid sub-account", { status: 400 });
            }
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                passwordHash,
                role: roleMap[normalizedRole] || Role.Client,
                clientId: normalizedRole === "client" ? (clientId || null) : null,
                organisationId: currentUser.organisationId ?? null,
            },
        });

        return NextResponse.json({ success: true, userId: user.id });
    } catch (error) {
        console.error("[USERS_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
