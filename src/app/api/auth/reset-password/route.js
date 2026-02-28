import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req) {
    try {
        const { token, password } = await req.json();

        if (!token || !password) {
            return NextResponse.json({ message: "Missing token or password" }, { status: 400 });
        }

        const resetToken = await prisma.verificationToken.findFirst({
            where: {
                token: token,
                expires: { gt: new Date() },
            },
        });

        if (!resetToken) {
            return NextResponse.json({ message: "Invalid or expired token" }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.update({
            where: { email: resetToken.identifier },
            data: {
                password: hashedPassword,
                emailVerified: new Date(), // Mark as verified since they could reset password via email
            },
        });

        // Delete the used token
        await prisma.verificationToken.delete({
            where: { token: token },
        });

        return NextResponse.json({ message: "Password reset successful! You can now log in." });
    } catch (error) {
        console.error("Reset password error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
