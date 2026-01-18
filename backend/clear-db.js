const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const deletedPredictions = await prisma.prediction.deleteMany();
  console.log('Deleted predictions:', deletedPredictions.count);

  const deletedUsers = await prisma.user.deleteMany();
  console.log('Deleted users:', deletedUsers.count);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
