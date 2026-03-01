import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "../../../../lib/prisma";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        // Fetch just the placeId for all leads this user has saved or skipped
        // We only need the ID string to quickly filter out the search results on the frontend
        const savedLeads = await prisma.savedLead.findMany({
            where: { userId: session.user.id },
            select: { placeId: true }
        });

        const interactedPlaceIds = savedLeads.map(lead => lead.placeId);

        return NextResponse.json({ placeIds: interactedPlaceIds });
    } catch (error) {
        console.error("Failed to fetch interacted place IDs:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
