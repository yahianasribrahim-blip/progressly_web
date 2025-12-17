import { prisma } from "../lib/db";

async function upgradeUser() {
    // Find the user by email
    const user = await prisma.user.findUnique({
        where: { email: "yahianasribrahi@gmail.com" },
    });

    if (!user) {
        console.log("No user found");
        return;
    }

    console.log("Found user:", user.email);

    // Update to Pro plan
    const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
            stripePriceId: "price_1Sb7i1LQIkjmWYDF8jTGCDkI", // Pro monthly
            stripeSubscriptionId: "sub_pro_manual_" + Date.now(),
            stripeCurrentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        },
    });

    console.log("User upgraded to Pro:", updated.email);
    console.log("stripePriceId:", updated.stripePriceId);
    console.log("stripeCurrentPeriodEnd:", updated.stripeCurrentPeriodEnd);
}

upgradeUser()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
