import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if user is admin
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { role: true },
        });

        if (user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { id } = await params;

        // Update ticket status to closed
        const ticket = await prisma.supportTicket.update({
            where: { id },
            data: { status: "closed" },
        });

        return NextResponse.json({ success: true, ticket });
    } catch (error) {
        console.error("Error closing ticket:", error);
        return NextResponse.json(
            { error: "Failed to close ticket" },
            { status: 500 }
        );
    }
}
