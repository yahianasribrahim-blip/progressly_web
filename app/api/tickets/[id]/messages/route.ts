import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// POST - Send a message to a ticket
export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { content } = body;

        if (!content) {
            return NextResponse.json({ success: false, error: "Content is required" }, { status: 400 });
        }

        // Verify the ticket belongs to the user
        const ticket = await prisma.supportTicket.findFirst({
            where: { id: params.id, userId: session.user.id },
        });

        if (!ticket) {
            return NextResponse.json({ success: false, error: "Ticket not found" }, { status: 404 });
        }

        const message = await prisma.ticketMessage.create({
            data: {
                ticketId: params.id,
                content,
                isAdmin: false, // User message
            },
        });

        return NextResponse.json({ success: true, message });
    } catch (error) {
        console.error("Error sending message:", error);
        return NextResponse.json({ success: false, error: "Failed to send message" }, { status: 500 });
    }
}
