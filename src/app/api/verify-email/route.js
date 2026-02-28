import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const token = searchParams.get("token");

        if (!token) {
            return NextResponse.json({ message: "Missing token" }, { status: 400 });
        }

        const verificationToken = await prisma.verificationToken.findUnique({
            where: { token },
        });

        if (!verificationToken) {
            return NextResponse.json({ message: "Invalid or expired token" }, { status: 400 });
        }

        if (new Date() > new Date(verificationToken.expires)) {
            // Token expired, delete it
            await prisma.verificationToken.delete({
                where: { token },
            });
            return NextResponse.json({ message: "Token expired. Please register again or request a new link." }, { status: 400 });
        }

        // Mark user as verified
        await prisma.user.update({
            where: { email: verificationToken.identifier },
            data: {
                emailVerified: new Date(),
            },
        });

        // Delete the token
        await prisma.verificationToken.delete({
            where: { token },
        });

        // Redirect to login page or show success message
        // return NextResponse.redirect(new URL("/login?verified=true", req.url));
        return NextResponse.json({ message: "Email verified successfully! You can now login." });
    } catch (error) {
        console.error("Verification error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
