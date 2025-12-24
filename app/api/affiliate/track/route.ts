import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { trackReferralClick, getAffiliateByCode, COOKIE_DURATION_DAYS } from "@/lib/affiliate";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { affiliateCode } = body;

        if (!affiliateCode) {
            return NextResponse.json({ error: "Affiliate code required" }, { status: 400 });
        }

        // Verify the affiliate exists and is approved
        const affiliate = await getAffiliateByCode(affiliateCode);

        if (!affiliate || affiliate.status !== "approved") {
            return NextResponse.json({ error: "Invalid affiliate code" }, { status: 400 });
        }

        // Track the click and get referral ID
        const referralId = await trackReferralClick(affiliateCode);

        if (!referralId) {
            return NextResponse.json({ error: "Failed to track referral" }, { status: 500 });
        }

        // Set cookies for tracking
        const cookieStore = await cookies();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + COOKIE_DURATION_DAYS);

        cookieStore.set("ref", affiliateCode, {
            expires: expiresAt,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
        });

        cookieStore.set("ref_id", referralId, {
            expires: expiresAt,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
        });

        return NextResponse.json({
            success: true,
            message: "Referral tracked",
        });
    } catch (error) {
        console.error("Error tracking referral:", error);
        return NextResponse.json(
            { error: "Failed to track referral" },
            { status: 500 }
        );
    }
}

// GET endpoint to check if user has a referral cookie
export async function GET() {
    try {
        const cookieStore = await cookies();
        const refCode = cookieStore.get("ref")?.value;
        const refId = cookieStore.get("ref_id")?.value;

        return NextResponse.json({
            hasReferral: !!refCode,
            affiliateCode: refCode || null,
            referralId: refId || null,
        });
    } catch (error) {
        console.error("Error checking referral:", error);
        return NextResponse.json({ hasReferral: false });
    }
}
