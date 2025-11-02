import { PrismaClient } from '@prisma/client';

// Prisma client dùng chung cho toàn bộ repositories/services
export const prisma = new PrismaClient();
