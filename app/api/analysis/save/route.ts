import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { canSaveContent } from "@/lib/user";

// GET - Retrieve saved analyses for current user
export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get or create user profile
        let profile = await prisma.userProfile.findUnique({
            where: { userId: session.user.id },
        });

        if (!profile) {
            profile = await prisma.userProfile.create({
                data: { userId: session.user.id },
            });
        }

        const savedAnalyses = await prisma.savedInsight.findMany({
            where: {
                profileId: profile.id,
                type: "analysis",
            },
            orderBy: { createdAt: "desc" },
            take: 50,
        });

        return NextResponse.json({
            success: true,
            analyses: savedAnalyses.map((item) => ({
                id: item.id,
                niche: item.title,
                data: item.metadata,
                savedAt: item.createdAt,
            })),
        });
    } catch (error) {
        console.error("Error fetching saved analyses:", error);
        return NextResponse.json(
            { error: "Failed to fetch saved analyses" },
            { status: 500 }
        );
    }
}

// POST - Save a new analysis
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
        const { niche, analysisData } = body;

        if (!niche || !analysisData) {
            return NextResponse.json(
                { error: "Missing niche or analysis data" },
                { status: 400 }
            );
        }

        // Get or create user profile
        let profile = await prisma.userProfile.findUnique({
            where: { userId: session.user.id },
        });

        if (!profile) {
            profile = await prisma.userProfile.create({
                data: { userId: session.user.id },
            });
        }

        // Save the analysis
        const savedAnalysis = await prisma.savedInsight.create({
            data: {
                profileId: profile.id,
                type: "analysis",
                title: niche,
                content: `Analysis for ${niche} niche`,
                metadata: analysisData,
            },
        });

        return NextResponse.json({
            success: true,
            id: savedAnalysis.id,
            message: "Analysis saved successfully",
        });
    } catch (error) {
        console.error("Error saving analysis:", error);
        return NextResponse.json(
            { error: "Failed to save analysis" },
            { status: 500 }
        );
    }
}

// DELETE - Delete a saved analysis
export async function DELETE(request: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const analysisId = searchParams.get("id");

        if (!analysisId) {
            return NextResponse.json(
                { error: "Missing analysis ID" },
                { status: 400 }
            );
        }

        // Get user profile
        const profile = await prisma.userProfile.findUnique({
            where: { userId: session.user.id },
        });

        if (!profile) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        // Delete the analysis (only if owned by user)
        await prisma.savedInsight.deleteMany({
            where: {
                id: analysisId,
                profileId: profile.id,
            },
        });

        return NextResponse.json({
            success: true,
            message: "Analysis deleted",
        });
    } catch (error) {
        console.error("Error deleting analysis:", error);
        return NextResponse.json(
            { error: "Failed to delete analysis" },
            { status: 500 }
        );
    }
}
