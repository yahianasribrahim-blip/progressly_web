import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// GET - Fetch all tickets for the user
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const tickets = await prisma.supportTicket.findMany({
            where: { userId: session.user.id },
            include: { messages: true },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ success: true, tickets });
    } catch (error) {
        console.error("Error fetching tickets:", error);
        return NextResponse.json({ success: false, error: "Failed to fetch tickets" }, { status: 500 });
    }
}

// POST - Create a new ticket
export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { title, description } = body;

        if (!title || !description) {
            return NextResponse.json({ success: false, error: "Title and description are required" }, { status: 400 });
        }

        const ticket = await prisma.supportTicket.create({
            data: {
                userId: session.user.id,
                title,
                description,
            },
            include: { messages: true },
        });

        return NextResponse.json({ success: true, ticket });
    } catch (error) {
        console.error("Error creating ticket:", error);
        return NextResponse.json({ success: false, error: "Failed to create ticket" }, { status: 500 });
    }
}
