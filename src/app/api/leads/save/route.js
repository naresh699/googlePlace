import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "../../../../lib/prisma";

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { lead } = await req.json();

        if (!lead || !lead.id) {
            return NextResponse.json({ error: "Invalid lead data" }, { status: 400 });
        }

        // Check if it already exists
        const existing = await prisma.savedLead.findFirst({
            where: {
                userId: session.user.id,
                placeId: lead.id
            }
        });

        if (existing) {
            return NextResponse.json({ message: "Lead already saved" }, { status: 200 });
        }

        // Save it
        const newSavedLead = await prisma.savedLead.create({
            data: {
                userId: session.user.id,
                placeId: String(lead.id),
                name: lead.name,
                address: lead.address,
                category: lead.category,
                phone: lead.phone,
                website: lead.website,
                description: lead.description || lead.email || '', // store any gen ai context
                distance: lead.distance
            }
        });

        return NextResponse.json({ success: true, savedLead: newSavedLead });

    } catch (error) {
        console.error("Save Lead Error:", error);
        return NextResponse.json({ error: "Failed to save lead" }, { status: 500 });
    }
}
