import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "../../../../lib/prisma";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);

        // Security check: Must be ADMIN
        if (!session?.user || session.user.role !== 'ADMIN') {
            return NextResponse.json({ message: "Unauthorized: Admins only" }, { status: 403 });
        }

        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                username: true,
                role: true,
                status: true,
                createdAt: true,
                emailVerified: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json({ users });
    } catch (error) {
        console.error("Failed to fetch users:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

export async function PUT(req) {
    try {
        const session = await getServerSession(authOptions);

        // Security check: Must be ADMIN
        if (!session?.user || session.user.role !== 'ADMIN') {
            return NextResponse.json({ message: "Unauthorized: Admins only" }, { status: 403 });
        }

        const { userId, status, role } = await req.json();

        if (!userId) {
            return NextResponse.json({ message: "User ID is required" }, { status: 400 });
        }

        // Prepare update data payload
        const updateData = {};
        if (status) updateData.status = status;
        if (role) updateData.role = role;

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true
            }
        });

        // TODO: At this stage you would historically trigger an email using lib/mail.js
        // For example: 
        // if (status === 'APPROVED') { await sendApprovalEmail(updatedUser.email); }
        // if (status === 'REJECTED') { await sendRejectionEmail(updatedUser.email); }

        return NextResponse.json({ user: updatedUser });
    } catch (error) {
        console.error("Failed to update user:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
