import { prisma } from "@/lib/db";
import crypto from "crypto";

// Commission rate as a decimal (25%)
export const COMMISSION_RATE = 0.25;

// Minimum payout amount in dollars
export const MINIMUM_PAYOUT = 50;

// Cookie duration in days
export const COOKIE_DURATION_DAYS = 30;

// Generate a unique affiliate code
export const generateAffiliateCode = (): string => {
    return crypto.randomBytes(4).toString("hex").toUpperCase();
};


// Get affiliate by user ID
export const getAffiliateByUserId = async (userId: string) => {
    return prisma.affiliate.findUnique({
        where: { userId },
        include: {
            referrals: {
                include: {
                    referredUser: {
                        select: { name: true, email: true, createdAt: true },
                    },
                },
                orderBy: { clickedAt: "desc" },
            },
            commissions: {
                orderBy: { createdAt: "desc" },
                take: 10,
            },
            payouts: {
                orderBy: { requestedAt: "desc" },
            },
        },
    });
};

// Get affiliate by code
export const getAffiliateByCode = async (code: string) => {
    return prisma.affiliate.findUnique({
        where: { affiliateCode: code },
    });
};

// Create affiliate application
export const createAffiliateApplication = async (
    userId: string,
    paypalEmail?: string,
    firstName?: string,
    lastName?: string,
    dateOfBirth?: Date,
    hasSocialFollowing?: boolean,
    socialHandle?: string
) => {
    // Check if user already has an affiliate record
    const existing = await prisma.affiliate.findUnique({
        where: { userId },
    });

    if (existing) {
        return { success: false, error: "You already have an affiliate application" };
    }

    const affiliate = await prisma.affiliate.create({
        data: {
            userId,
            affiliateCode: generateAffiliateCode(),
            paypalEmail,
            firstName,
            lastName,
            dateOfBirth,
            hasSocialFollowing: hasSocialFollowing || false,
            socialHandle,
            status: "pending",
        },
    });

    return { success: true, affiliate };
};

// Approve affiliate
export const approveAffiliate = async (affiliateId: string) => {
    return prisma.affiliate.update({
        where: { id: affiliateId },
        data: { status: "approved" },
    });
};

// Suspend affiliate
export const suspendAffiliate = async (affiliateId: string) => {
    return prisma.affiliate.update({
        where: { id: affiliateId },
        data: { status: "suspended" },
    });
};

// Track referral click
export const trackReferralClick = async (affiliateCode: string) => {
    const affiliate = await getAffiliateByCode(affiliateCode);

    if (!affiliate || affiliate.status !== "approved") {
        return null;
    }

    // Create a new referral record for this click
    const referral = await prisma.referral.create({
        data: {
            affiliateId: affiliate.id,
            status: "clicked",
        },
    });

    return referral.id;
};

// Link referral to signed-up user
export const linkReferralToUser = async (referralId: string, userId: string) => {
    // Check if this user is already linked to a referral
    const existingReferral = await prisma.referral.findUnique({
        where: { referredUserId: userId },
    });

    if (existingReferral) {
        return null; // User already referred
    }

    return prisma.referral.update({
        where: { id: referralId },
        data: {
            referredUserId: userId,
            status: "signed_up",
            signedUpAt: new Date(),
        },
    });
};

// Find pending referral by affiliate code (for linking on signup)
export const findOrCreateReferralForSignup = async (affiliateCode: string, userId: string) => {
    const affiliate = await getAffiliateByCode(affiliateCode);

    if (!affiliate || affiliate.status !== "approved") {
        return null;
    }

    // Check if user already has a referral
    const existingReferral = await prisma.referral.findUnique({
        where: { referredUserId: userId },
    });

    if (existingReferral) {
        return existingReferral;
    }

    // Create new referral linked to user
    return prisma.referral.create({
        data: {
            affiliateId: affiliate.id,
            referredUserId: userId,
            status: "signed_up",
            signedUpAt: new Date(),
        },
    });
};

// Record commission for a payment
export const recordCommission = async (
    userId: string,
    paymentAmount: number,
    stripePaymentId: string
) => {
    // Find the referral for this user
    const referral = await prisma.referral.findUnique({
        where: { referredUserId: userId },
        include: { affiliate: true },
    });

    if (!referral || referral.affiliate.status !== "approved") {
        return null;
    }

    const commissionAmount = paymentAmount * COMMISSION_RATE;

    // Create commission record
    const commission = await prisma.commission.create({
        data: {
            affiliateId: referral.affiliateId,
            referralId: referral.id,
            amount: commissionAmount,
            stripePaymentId,
            status: "pending",
        },
    });

    // Update referral status if first conversion
    if (referral.status !== "converted") {
        await prisma.referral.update({
            where: { id: referral.id },
            data: {
                status: "converted",
                convertedAt: new Date(),
            },
        });
    }

    // Update affiliate earnings
    await prisma.affiliate.update({
        where: { id: referral.affiliateId },
        data: {
            totalEarnings: { increment: commissionAmount },
            pendingEarnings: { increment: commissionAmount },
        },
    });

    return commission;
};

// Approve pending commissions (make them payable)
export const approveCommission = async (commissionId: string) => {
    return prisma.commission.update({
        where: { id: commissionId },
        data: { status: "approved" },
    });
};

// Request payout
export const requestPayout = async (affiliateId: string, amount: number, paypalEmail: string) => {
    const affiliate = await prisma.affiliate.findUnique({
        where: { id: affiliateId },
    });

    if (!affiliate) {
        return { success: false, error: "Affiliate not found" };
    }

    if (affiliate.pendingEarnings < MINIMUM_PAYOUT) {
        return { success: false, error: `Minimum payout is $${MINIMUM_PAYOUT}` };
    }

    if (amount > affiliate.pendingEarnings) {
        return { success: false, error: "Insufficient balance" };
    }

    const payout = await prisma.payout.create({
        data: {
            affiliateId,
            amount,
            paypalEmail,
            status: "requested",
        },
    });

    return { success: true, payout };
};

// Process payout (admin action)
export const processPayout = async (payoutId: string, action: "complete" | "reject", notes?: string) => {
    const payout = await prisma.payout.findUnique({
        where: { id: payoutId },
        include: { affiliate: true },
    });

    if (!payout) {
        return { success: false, error: "Payout not found" };
    }

    if (action === "complete") {
        // Mark commissions as paid
        await prisma.commission.updateMany({
            where: {
                affiliateId: payout.affiliateId,
                status: "pending",
            },
            data: { status: "paid" },
        });

        // Update affiliate earnings
        await prisma.affiliate.update({
            where: { id: payout.affiliateId },
            data: {
                pendingEarnings: { decrement: payout.amount },
                paidEarnings: { increment: payout.amount },
            },
        });

        // Update payout status
        await prisma.payout.update({
            where: { id: payoutId },
            data: {
                status: "completed",
                processedAt: new Date(),
                notes,
            },
        });
    } else {
        // Reject payout
        await prisma.payout.update({
            where: { id: payoutId },
            data: {
                status: "rejected",
                processedAt: new Date(),
                notes,
            },
        });
    }

    return { success: true };
};

// Get affiliate stats
export const getAffiliateStats = async (affiliateId: string) => {
    const affiliate = await prisma.affiliate.findUnique({
        where: { id: affiliateId },
        include: {
            referrals: true,
            commissions: true,
        },
    });

    if (!affiliate) return null;

    const clicks = affiliate.referrals.length;
    const signups = affiliate.referrals.filter(r => r.status === "signed_up" || r.status === "converted").length;
    const conversions = affiliate.referrals.filter(r => r.status === "converted").length;

    return {
        clicks,
        signups,
        conversions,
        conversionRate: clicks > 0 ? ((conversions / clicks) * 100).toFixed(1) : "0",
        totalEarnings: affiliate.totalEarnings,
        pendingEarnings: affiliate.pendingEarnings,
        paidEarnings: affiliate.paidEarnings,
    };
};
