import { PrismaClient, Prisma } from '@prisma/client';
import { PlayerFilters } from '../types/index.js';

const prisma = new PrismaClient();

export const playersService = {
  async findAll(filters: PlayerFilters = {}) {
    const where: Prisma.PlayerWhereInput = {};

    if (filters.membershipType) where.membershipType = filters.membershipType as any;
    if (filters.membershipStatus) where.membershipStatus = filters.membershipStatus as any;

    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search, mode: 'insensitive' } },
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return prisma.player.findMany({
      where,
      orderBy: { lastName: 'asc' },
    });
  },

  async findById(id: string) {
    return prisma.player.findUnique({
      where: { id },
      include: {
        enrollments: {
          include: {
            event: true,
          },
          orderBy: {
            event: { startTime: 'desc' },
          },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  },

  async create(data: Prisma.PlayerCreateInput) {
    return prisma.player.create({ data });
  },

  async update(id: string, data: Prisma.PlayerUpdateInput) {
    // If membership status is being updated, also update statusUpdatedAt
    if (data.membershipStatus) {
      data.statusUpdatedAt = new Date();
    }
    return prisma.player.update({
      where: { id },
      data,
    });
  },

  async delete(id: string) {
    // Delete related records first
    await prisma.enrollment.deleteMany({ where: { playerId: id } });
    await prisma.transaction.deleteMany({ where: { playerId: id } });
    return prisma.player.delete({ where: { id } });
  },

  async addCredits(id: string, classCredits: number, dropInCredits: number) {
    return prisma.player.update({
      where: { id },
      data: {
        classCredits: { increment: classCredits },
        dropInCredits: { increment: dropInCredits },
      },
    });
  },

  async useCredit(id: string, creditType: 'class' | 'dropIn') {
    const field = creditType === 'class' ? 'classCredits' : 'dropInCredits';
    return prisma.player.update({
      where: { id },
      data: {
        [field]: { decrement: 1 },
      },
    });
  },
};

export default playersService;
