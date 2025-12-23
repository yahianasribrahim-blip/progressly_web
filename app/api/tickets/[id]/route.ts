import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// PATCH - Update ticket (close/reopen)
export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { status } = body;

        const ticket = await prisma.supportTicket.update({
            where: { id: params.id, userId: session.user.id },
            data: { status },
        });

        return NextResponse.json({ success: true, ticket });
    } catch (error) {
        console.error("Error updating ticket:", error);
        return NextResponse.json({ success: false, error: "Failed to update ticket" }, { status: 500 });
    }
}

// DELETE - Delete a ticket
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        await prisma.supportTicket.delete({
            where: { id: params.id, userId: session.user.id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting ticket:", error);
        return NextResponse.json({ success: false, error: "Failed to delete ticket" }, { status: 500 });
    }
}
