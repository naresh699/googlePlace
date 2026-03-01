import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "../../../lib/prisma";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const savedLeads = await prisma.savedLead.findMany({
            where: {
                userId: session.user.id
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });

        return NextResponse.json({ leads: savedLeads });

    } catch (error) {
        console.error("Fetch Pipeline Error:", error);
        return NextResponse.json({ error: "Failed to fetch pipeline" }, { status: 500 });
    }
}

export async function PUT(req) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id, updates } = await req.json();

        if (!id || !updates) {
            return NextResponse.json({ error: "Invalid data" }, { status: 400 });
        }

        // Verify ownership
        const existing = await prisma.savedLead.findFirst({
            where: { id: id, userId: session.user.id }
        });

        if (!existing) {
            return NextResponse.json({ error: "Lead not found" }, { status: 404 });
        }

        const updatedLead = await prisma.savedLead.update({
            where: { id: id },
            data: {
                qualificationStatus: updates.qualificationStatus,
                communicationStatus: updates.communicationStatus,
                leadOutcome: updates.leadOutcome,
                complexityScore: updates.complexityScore,
                pricingEstimate: updates.pricingEstimate,
                notes: updates.notes,
                calledAt: updates.calledAt !== undefined ? updates.calledAt : undefined,
                metAt: updates.metAt !== undefined ? updates.metAt : undefined,
                leadGeneratedAt: updates.leadGeneratedAt !== undefined ? updates.leadGeneratedAt : undefined,
                workStartedAt: updates.workStartedAt !== undefined ? updates.workStartedAt : undefined,
                projectDeliveredAt: updates.projectDeliveredAt !== undefined ? updates.projectDeliveredAt : undefined,
                closedAt: updates.closedAt !== undefined ? updates.closedAt : undefined,
            }
        });

        return NextResponse.json({ success: true, lead: updatedLead });

    } catch (error) {
        console.error("Update Pipeline Error:", error);
        return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
    }
}
