import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

/** Creates the first admin. They sign in with an email OTP sent to this address. */
async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? '').trim().toLowerCase();
  if (!email) throw new Error('Set SEED_ADMIN_EMAIL in .env before seeding.');

  const admin = await prisma.user.upsert({
    where: { email },
    update: { role: Role.ADMIN },
    create: { email, name: 'Platform Admin', role: Role.ADMIN, emailVerifiedAt: new Date() },
  });
  console.log(`Admin account ready: ${admin.email} (sign in with an email code)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
