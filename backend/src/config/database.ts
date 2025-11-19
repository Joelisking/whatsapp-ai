import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export async function initializeDatabase() {
  try {
    await prisma.$connect();
    return prisma;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
}

process.on('beforeExit', async () => {
  await disconnectDatabase();
});
