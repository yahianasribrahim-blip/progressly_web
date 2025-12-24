import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { canSaveContent } from "@/lib/user";

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
        const { title, concept, shotByShot, tips, sourceVideo } = body;

        if (!title || !concept) {
            return NextResponse.json(
                { error: "Title and concept are required" },
                { status: 400 }
            );
        }

        const savedIdea = await prisma.savedIdea.create({
            data: {
                userId: session.user.id,
                title,
                concept,
                shotByShot: shotByShot || null,
                tips: tips || [],
                sourceVideo: sourceVideo || null,
                status: "saved",
            },
        });

        return NextResponse.json({
            success: true,
            idea: savedIdea,
        });
    } catch (error) {
        console.error("Error saving idea:", error);
        return NextResponse.json(
            { error: "Failed to save idea" },
            { status: 500 }
        );
    }
}

export async function GET(request: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status");

        const ideas = await prisma.savedIdea.findMany({
            where: {
                userId: session.user.id,
                ...(status && status !== "all" ? { status } : {}),
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return NextResponse.json({
            success: true,
            ideas,
        });
    } catch (error) {
        console.error("Error fetching ideas:", error);
        return NextResponse.json(
            { error: "Failed to fetch ideas" },
            { status: 500 }
        );
    }
}
