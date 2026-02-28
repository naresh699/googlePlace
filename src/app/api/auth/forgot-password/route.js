import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import crypto from "crypto";
import nodemailer from "nodemailer";

export async function POST(req) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ message: "Email is required" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
        });

        if (!user) {
            // Return success even if user not found for security
            return NextResponse.json({ message: "If an account exists with this email, a reset link has been sent." });
        }

        // Generate Reset Token
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 3600000); // 1 hour

        // Reuse VerificationToken model for reset tokens or create a new one if preferred.
        // For simplicity, we'll use a dedicated token record if available, 
        // but here we will create it in a way that maps to our schema.
        await prisma.verificationToken.create({
            data: {
                identifier: user.email,
                token: token,
                expires: expires,
            },
        });

        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const resetUrl = `${baseUrl}/reset-password?token=${token}`;

        // Send Email
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_SERVER_HOST,
            port: parseInt(process.env.EMAIL_SERVER_PORT || "587"),
            secure: process.env.EMAIL_SERVER_PORT === "465",
            auth: {
                user: process.env.EMAIL_SERVER_USER,
                pass: process.env.EMAIL_SERVER_PASSWORD,
            },
        });

        await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: user.email,
            subject: "Reset your password",
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
                    <h2>Password Reset Request</h2>
                    <p>You requested a password reset for your account at GooglePlace.</p>
                    <p>Click the button below to set a new password. This link expires in 1 hour.</p>
                    <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
                    <p style="margin-top: 20px;">If you didn't request this, you can safely ignore this email.</p>
                </div>
            `,
        });

        return NextResponse.json({ message: "If an account exists with this email, a reset link has been sent." });
    } catch (error) {
        console.error("Forgot password error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
