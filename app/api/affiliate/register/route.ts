import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateAffiliateCode } from "@/lib/affiliate";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            email,
            firstName,
            lastName,
            dateOfBirth,
            hasTikTokFollowing,
            tiktokHandle,
            hasInstagramFollowing,
            instagramHandle,
        } = body;

        // Validate required fields
        if (!email || !firstName || !lastName) {
            return NextResponse.json(
                { error: "Email, first name, and last name are required" },
                { status: 400 }
            );
        }

        // Check if affiliate already exists with this email
        const existingAffiliate = await prisma.affiliate.findUnique({
            where: { email },
        });

        if (existingAffiliate) {
            return NextResponse.json(
                { error: "An affiliate account with this email already exists" },
                { status: 400 }
            );
        }

        // Check if user exists with this email
        let user = await prisma.user.findUnique({
            where: { email },
        });

        // Create user if doesn't exist
        if (!user) {
            user = await prisma.user.create({
                data: {
                    email,
                    name: `${firstName} ${lastName}`,
                },
            });
        }

        // Combine social handles for storage
        const socialHandle = [
            tiktokHandle ? `TikTok: ${tiktokHandle}` : null,
            instagramHandle ? `Instagram: ${instagramHandle}` : null,
        ].filter(Boolean).join(", ") || null;

        // Create affiliate with APPROVED status (auto-approval)
        const affiliate = await prisma.affiliate.create({
            data: {
                userId: user.id,
                email,
                affiliateCode: generateAffiliateCode(),
                status: "approved", // Auto-approve!
                firstName,
                lastName,
                dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
                hasSocialFollowing: hasTikTokFollowing || hasInstagramFollowing,
                socialHandle,
                paypalEmail: email, // Default to their email
            },
        });

        return NextResponse.json({
            success: true,
            affiliate: {
                id: affiliate.id,
                affiliateCode: affiliate.affiliateCode,
                status: affiliate.status,
            },
            message: "Affiliate account created successfully!",
        });
    } catch (error) {
        console.error("Error registering affiliate:", error);
        return NextResponse.json(
            { error: "Failed to create affiliate account" },
            { status: 500 }
        );
    }
}
