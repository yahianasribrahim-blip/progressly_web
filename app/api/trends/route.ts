import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { canSaveContent } from "@/lib/user";

// GET all saved trends for user
export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const trends = await prisma.savedTrend.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ success: true, data: trends });
    } catch (error) {
        console.error("Error fetching saved trends:", error);
        return NextResponse.json({ error: "Failed to fetch trends" }, { status: 500 });
    }
}

// POST - Save a new trend
export async function POST(request: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if user is on a paid plan
        const saveCheck = await canSaveContent(session.user.id);
        if (!saveCheck.allowed) {
            return NextResponse.json({
                error: saveCheck.message,
                requiresUpgrade: true,
            }, { status: 403 });
        }

        const body = await request.json();
        const { formatName, formatDescription, whyItWorks, howToApply, halalAudio, niches, avgStats } = body;

        if (!formatName || !formatDescription) {
            return NextResponse.json({ error: "Format name and description are required" }, { status: 400 });
        }

        const trend = await prisma.savedTrend.create({
            data: {
                userId: session.user.id,
                formatName,
                formatDescription,
                whyItWorks: whyItWorks || "",
                howToApply: howToApply || [],
                halalAudio: halalAudio || [],
                niches: niches || [],
                avgStats: avgStats || null,
            },
        });

        return NextResponse.json({ success: true, data: trend });
    } catch (error) {
        console.error("Error saving trend:", error);
        return NextResponse.json({ error: "Failed to save trend" }, { status: 500 });
    }
}
