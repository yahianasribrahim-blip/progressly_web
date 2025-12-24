import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAffiliateApplication, getAffiliateByUserId } from "@/lib/affiliate";

export async function POST(request: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { paypalEmail, firstName, lastName, dateOfBirth, hasSocialFollowing, socialHandle } = body;

        // Validate required fields
        if (!firstName || !lastName || !dateOfBirth) {
            return NextResponse.json(
                { error: "First name, last name, and date of birth are required" },
                { status: 400 }
            );
        }

        // Check if user already has an affiliate record
        const existing = await getAffiliateByUserId(session.user.id);
        if (existing) {
            return NextResponse.json(
                { error: "You already have an affiliate application", status: existing.status },
                { status: 400 }
            );
        }

        const result = await createAffiliateApplication(
            session.user.id,
            paypalEmail,
            firstName,
            lastName,
            dateOfBirth ? new Date(dateOfBirth) : undefined,
            hasSocialFollowing,
            socialHandle
        );

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            affiliate: result.affiliate,
            message: "Your application has been submitted! We'll review it shortly.",
        });
    } catch (error) {
        console.error("Error applying for affiliate:", error);
        return NextResponse.json(
            { error: "Failed to submit application" },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const affiliate = await getAffiliateByUserId(session.user.id);

        return NextResponse.json({
            success: true,
            affiliate,
        });
    } catch (error) {
        console.error("Error fetching affiliate:", error);
        return NextResponse.json(
            { error: "Failed to fetch affiliate data" },
            { status: 500 }
        );
    }
}
