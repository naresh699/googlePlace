import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "../../../../lib/prisma";

export const authOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                username: { label: "Username", type: "text", placeholder: "jsmith" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.username || !credentials?.password) {
                    throw new Error("Missing username or email/password");
                }

                const loginValue = credentials.username.trim();

                // Find user by username or email
                let user = await prisma.user.findUnique({
                    where: { username: loginValue }
                });

                if (!user) {
                    user = await prisma.user.findUnique({
                        where: { email: loginValue.toLowerCase() }
                    });
                }

                if (!user) {
                    user = await prisma.user.findUnique({
                        where: { email: loginValue }
                    });
                }

                if (!user || !user.password) {
                    throw new Error("Invalid username/email or password");
                }

                const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

                if (!isPasswordValid) {
                    throw new Error("Invalid username or password");
                }

                if (!user.emailVerified) {
                    throw new Error("Please verify your email to login.");
                }

                if (user.status !== "APPROVED") {
                    throw new Error("Your account is pending admin approval.");
                }

                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    username: user.username,
                    role: user.role,
                    status: user.status
                };
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.username = user.username;
                token.role = user.role;
                token.status = user.status;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id;
                session.user.username = token.username;
                session.user.role = token.role;
                session.user.status = token.status;
            }
            return session;
        }
    },
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET || "fallback_secret_for_development",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
