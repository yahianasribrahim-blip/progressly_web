import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { recordAnalysisUsage } from "@/lib/user";

export async function POST(req: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 }
            );
        }

        await recordAnalysisUsage(session.user.id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error recording analysis:", error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}
