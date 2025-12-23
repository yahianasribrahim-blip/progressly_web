import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { AdminTickets } from "@/components/admin/admin-tickets";

export const metadata = {
    title: "Tickets – Progressly Admin",
    description: "Manage support tickets",
};

export default async function AdminTicketsPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/login");
    }

    // Check if user is admin
    const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    if (currentUser?.role !== "ADMIN") {
        redirect("/dashboard");
    }

    // Fetch all tickets
    const tickets = await prisma.supportTicket.findMany({
        orderBy: { updatedAt: "desc" },
        include: {
            user: { select: { name: true, email: true } },
            messages: { orderBy: { createdAt: "asc" } },
        },
    });

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <AdminTickets tickets={tickets} />
        </div>
    );
}
