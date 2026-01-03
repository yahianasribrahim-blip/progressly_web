import { NextResponse } from "next/server";
import { createPublicAffiliateApplication } from "@/lib/affiliate";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, firstName, lastName, dateOfBirth, hasSocialFollowing, socialHandle, paypalEmail } = body;

        // Validate required fields
        if (!email || !firstName || !lastName) {
            return NextResponse.json(
                { error: "Email, first name, and last name are required" },
                { status: 400 }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: "Please enter a valid email address" },
                { status: 400 }
            );
        }

        const result = await createPublicAffiliateApplication(
            email,
            firstName,
            lastName,
            dateOfBirth ? new Date(dateOfBirth) : undefined,
            hasSocialFollowing,
            socialHandle,
            paypalEmail
        );

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            message: "Your application has been submitted! We'll review it within 24 hours.",
        });
    } catch (error) {
        console.error("Error applying for affiliate:", error);
        return NextResponse.json(
            { error: "Failed to submit application. Please try again." },
            { status: 500 }
        );
    }
}
