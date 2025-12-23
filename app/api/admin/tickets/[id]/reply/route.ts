import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// POST - Admin reply to a ticket
export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        // Check if user is admin
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { role: true },
        });

        if (user?.role !== "ADMIN") {
            return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json();
        const { content } = body;

        if (!content) {
            return NextResponse.json({ success: false, error: "Content is required" }, { status: 400 });
        }

        // Create admin message
        const message = await prisma.ticketMessage.create({
            data: {
                ticketId: params.id,
                content,
                isAdmin: true, // This is an admin reply
            },
        });

        // Update ticket's updatedAt
        await prisma.supportTicket.update({
            where: { id: params.id },
            data: { updatedAt: new Date() },
        });

        return NextResponse.json({ success: true, message });
    } catch (error) {
        console.error("Error sending admin reply:", error);
        return NextResponse.json({ success: false, error: "Failed to send reply" }, { status: 500 });
    }
}
