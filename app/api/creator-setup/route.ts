import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// GET: Retrieve creator setup for current user
export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get user profile with creator setup
        const profile = await prisma.userProfile.findUnique({
            where: { userId: session.user.id },
            include: { creatorSetup: true },
        });

        if (!profile) {
            return NextResponse.json({
                hasProfile: false,
                onboardingCompleted: false,
                creatorSetup: null
            });
        }

        return NextResponse.json({
            hasProfile: true,
            onboardingCompleted: profile.onboardingCompleted,
            creatorSetup: profile.creatorSetup,
        });
    } catch (error) {
        console.error("Error fetching creator setup:", error);
        return NextResponse.json(
            { error: "Failed to fetch creator setup" },
            { status: 500 }
        );
    }
}

// POST: Save creator setup (onboarding)
export async function POST(request: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const {
            teamSize,
            // Content description fields
            contentActivity,
            filmingStyle,
            resourcesAccess,
            contentConstraints,
            // Equipment
            primaryDevice,
            hasExternalMic,
            hasLighting,
            hasGreenScreen,
            availableProps,
            filmingLocations,
            hoursPerVideo,
            videosPerWeek,
            isMuslimCreator,
            prefersNoMusic,
            experienceLevel,
            targetAudience,
        } = body;

        // Generate combined contentNiche from detailed fields
        const contentNicheParts = [
            contentActivity && `Activity: ${contentActivity}`,
            filmingStyle && `Filming: ${filmingStyle}`,
            resourcesAccess && `Access: ${resourcesAccess}`,
            contentConstraints && `Constraints: ${contentConstraints}`,
        ].filter(Boolean);
        const contentNiche = contentNicheParts.length > 0 ? contentNicheParts.join(". ") : null;

        // First, ensure user has a profile
        let profile = await prisma.userProfile.findUnique({
            where: { userId: session.user.id },
        });

        if (!profile) {
            // Create profile if it doesn't exist
            profile = await prisma.userProfile.create({
                data: {
                    userId: session.user.id,
                    onboardingCompleted: false,
                },
            });
        }

        // Upsert creator setup
        const creatorSetup = await prisma.creatorSetup.upsert({
            where: { profileId: profile.id },
            update: {
                teamSize: teamSize || 1,
                // Content description
                contentActivity: contentActivity || null,
                filmingStyle: filmingStyle || null,
                resourcesAccess: resourcesAccess || null,
                contentConstraints: contentConstraints || null,
                contentNiche: contentNiche,
                // Equipment
                primaryDevice: primaryDevice || null,
                hasExternalMic: hasExternalMic || false,
                hasLighting: hasLighting || false,
                hasGreenScreen: hasGreenScreen || false,
                availableProps: availableProps || [],
                filmingLocations: filmingLocations || [],
                hoursPerVideo: hoursPerVideo || 2,
                videosPerWeek: videosPerWeek || 3,
                isMuslimCreator: isMuslimCreator || false,
                prefersNoMusic: prefersNoMusic || false,
                experienceLevel: experienceLevel || "beginner",
                targetAudience: targetAudience || "young_adults",
            },
            create: {
                profileId: profile.id,
                teamSize: teamSize || 1,
                // Content description
                contentActivity: contentActivity || null,
                filmingStyle: filmingStyle || null,
                resourcesAccess: resourcesAccess || null,
                contentConstraints: contentConstraints || null,
                contentNiche: contentNiche,
                // Equipment
                primaryDevice: primaryDevice || null,
                hasExternalMic: hasExternalMic || false,
                hasLighting: hasLighting || false,
                hasGreenScreen: hasGreenScreen || false,
                availableProps: availableProps || [],
                filmingLocations: filmingLocations || [],
                hoursPerVideo: hoursPerVideo || 2,
                videosPerWeek: videosPerWeek || 3,
                isMuslimCreator: isMuslimCreator || false,
                prefersNoMusic: prefersNoMusic || false,
                experienceLevel: experienceLevel || "beginner",
                targetAudience: targetAudience || "young_adults",
            },
        });

        // Mark onboarding as completed
        await prisma.userProfile.update({
            where: { id: profile.id },
            data: { onboardingCompleted: true },
        });

        return NextResponse.json({
            success: true,
            creatorSetup,
        });
    } catch (error) {
        console.error("Error saving creator setup:", error);
        return NextResponse.json(
            { error: "Failed to save creator setup" },
            { status: 500 }
        );
    }
}
