import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import bcrypt from "bcryptjs";
import { sendVerificationEmail } from "../../../lib/mail";
import crypto from "crypto";


export async function POST(req) {
    try {
        const { name, email, username, password } = await req.json();

        if (!name || !email || !username || !password) {
            return NextResponse.json(
                { message: "Missing required fields" },
                { status: 400 }
            );
        }

        const normalizedEmail = email.toLowerCase().trim();
        const normalizedUsername = username.trim();



        // Check if user exists
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: normalizedEmail },
                    { username: normalizedUsername }
                ],
            },
        });

        if (existingUser) {
            return NextResponse.json(
                { message: "User with this email or username already exists" },
                { status: 409 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        await prisma.user.create({
            data: {
                name,
                email: normalizedEmail,
                username: normalizedUsername,
                password: hashedPassword,
            },
        });

        // Generate Verification Token
        const token = crypto.randomBytes(32).toString('hex');
        await prisma.verificationToken.create({
            data: {
                identifier: normalizedEmail,
                token: token,
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            },
        });

        // Send Verification Email
        const emailResult = await sendVerificationEmail(normalizedEmail, token);

        if (!emailResult.success) {
            console.error("Failed to send verification email:", emailResult.error);
            // Optionally, we could delete the user here, but for now we'll just inform the user
            return NextResponse.json(
                {
                    message: "User created, but we couldn't send the verification email. Please contact support.",
                    error: emailResult.error
                },
                { status: 201 }
            );
        }

        // Return the verification URL in simulation mode for easier development
        if (emailResult.simulation) {
            return NextResponse.json(
                {
                    message: "User created successfully. (EMAIL SIMULATION MODE)",
                    verificationUrl: emailResult.url,
                    info: "No real email was sent because SMTP is not configured. Use the link below to verify manually."
                },
                { status: 201 }
            );
        }

        return NextResponse.json(
            { message: "User created successfully. Please check your email to verify your account." },
            { status: 201 }
        );
    } catch (error) {
        console.error("Registration error:", error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}
