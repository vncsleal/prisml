import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Neon database...');

  // Clear existing
  await prisma.user.deleteMany();

  const users = [];
  for (let i = 0; i < 500; i++) {
    const totalSpent = Math.random() * 1000;
    const daysSinceLogin = Math.floor(Math.random() * 60);
    const lastLogin = new Date();
    lastLogin.setDate(lastLogin.getDate() - daysSinceLogin);

    // Synthetic logic for churn: 
    // If they haven't logged in for > 30 days and spent < 100, they likely churned.
    const isChurned = daysSinceLogin > 30 && totalSpent < 200;

    users.push({
      email: `user${i}@example.com`,
      totalSpent,
      lastLogin,
      isChurned
    });
  }

  await prisma.user.createMany({
    data: users
  });

  console.log('✅ Successfully seeded 500 users.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
