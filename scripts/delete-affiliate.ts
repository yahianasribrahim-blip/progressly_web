// Temporary script to delete affiliate record
// Run with: npx ts-node scripts/delete-affiliate.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'yahianasribrahim@gmail.com';

    // Find user by email
    const user = await prisma.user.findUnique({
        where: { email },
        include: { affiliate: true }
    });

    if (!user) {
        console.log('User not found with email:', email);
        return;
    }

    console.log('Found user:', user.id, user.email);

    if (!user.affiliate) {
        console.log('User has no affiliate record');
        return;
    }

    console.log('Found affiliate:', user.affiliate.id, user.affiliate.affiliateCode);

    // Delete the affiliate record (this will cascade delete referrals, commissions, payouts)
    await prisma.affiliate.delete({
        where: { id: user.affiliate.id }
    });

    console.log('✅ Affiliate record deleted successfully!');
    console.log('You can now re-register as an affiliate.');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
