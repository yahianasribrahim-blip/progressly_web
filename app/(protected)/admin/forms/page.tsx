import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { AdminFormSubmissions } from "@/components/admin/admin-form-submissions";

export const metadata = {
    title: "Form Submissions – Admin",
    description: "View user onboarding form submissions",
};

export default async function AdminFormsPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/login");
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    if (user?.role !== "ADMIN") {
        redirect("/dashboard");
    }

    // Fetch all creator setups with user info
    const submissions = await prisma.creatorSetup.findMany({
        include: {
            profile: {
                include: {
                    user: {
                        select: {
                            name: true,
                            email: true,
                        },
                    },
                },
            },
        },
        orderBy: { createdAt: "desc" },
    });

    // Transform data to flat structure for component
    const formattedSubmissions = submissions.map((sub) => ({
        id: sub.id,
        profileId: sub.profileId,
        teamSize: sub.teamSize,
        primaryDevice: sub.primaryDevice,
        hasExternalMic: sub.hasExternalMic,
        hasLighting: sub.hasLighting,
        hasGreenScreen: sub.hasGreenScreen,
        availableProps: sub.availableProps,
        filmingLocations: sub.filmingLocations,
        hoursPerVideo: sub.hoursPerVideo,
        videosPerWeek: sub.videosPerWeek,
        isMuslimCreator: sub.isMuslimCreator,
        prefersNoMusic: sub.prefersNoMusic,
        targetAudience: sub.targetAudience,
        experienceLevel: sub.experienceLevel,
        contentActivity: sub.contentActivity,
        filmingStyle: sub.filmingStyle,
        resourcesAccess: sub.resourcesAccess,
        contentConstraints: sub.contentConstraints,
        contentNiche: sub.contentNiche,
        createdAt: sub.createdAt,
        user: {
            name: sub.profile.user.name,
            email: sub.profile.user.email,
        },
    }));

    return (
        <div className="p-6">
            <AdminFormSubmissions submissions={formattedSubmissions} />
        </div>
    );
}
