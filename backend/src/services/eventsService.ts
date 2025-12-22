import { PrismaClient, Event, Prisma } from '@prisma/client';
import { EventFilters } from '../types/index.js';

const prisma = new PrismaClient();

export const eventsService = {
  async findAll(filters: EventFilters = {}) {
    const where: Prisma.EventWhereInput = {};

    if (filters.startDate || filters.endDate) {
      where.startTime = {};
      if (filters.startDate) where.startTime.gte = filters.startDate;
      if (filters.endDate) where.startTime.lte = filters.endDate;
    }

    if (filters.eventType) where.eventType = filters.eventType as any;
    if (filters.courtId) where.courtId = filters.courtId;
    if (filters.level) where.level = filters.level as any;
    if (filters.gender) where.gender = filters.gender as any;
    if (filters.isYouth !== undefined) where.isYouth = filters.isYouth;
    if (filters.status) where.status = filters.status as any;

    return prisma.event.findMany({
      where,
      include: {
        enrollments: {
          include: {
            player: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });
  },

  async findById(id: string) {
    return prisma.event.findUnique({
      where: { id },
      include: {
        enrollments: {
          include: {
            player: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    });
  },

  async create(data: Prisma.EventCreateInput) {
    return prisma.event.create({
      data,
      include: {
        enrollments: true,
      },
    });
  },

  async update(id: string, data: Prisma.EventUpdateInput) {
    return prisma.event.update({
      where: { id },
      data,
      include: {
        enrollments: {
          include: {
            player: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });
  },

  async delete(id: string) {
    // First delete enrollments, then the event
    await prisma.enrollment.deleteMany({
      where: { eventId: id },
    });
    return prisma.event.delete({
      where: { id },
    });
  },

  async getEnrollmentCount(id: string): Promise<number> {
    return prisma.enrollment.count({
      where: {
        eventId: id,
        status: 'REGISTERED',
      },
    });
  },
};

export default eventsService;
