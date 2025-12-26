import { PrismaClient } from '@prisma/client';
import { isEventEditable } from '../utils/eventUtils.js';

const prisma = new PrismaClient();

export const enrollmentService = {
  async enroll(eventId: string, playerId: string) {
    // Get event and check it exists
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new Error('Event not found');
    }

    // Check event is still editable
    if (!isEventEditable(event.startTime)) {
      throw new Error('Event can no longer be modified');
    }

    // Check player exists
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) {
      throw new Error('Player not found');
    }

    // Check player isn't already enrolled
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: { playerId_eventId: { playerId, eventId } },
    });
    if (existingEnrollment) {
      throw new Error('Player is already enrolled in this event');
    }

    // Determine status based on capacity
    const status = event.currentEnrollment >= event.maxCapacity
      ? 'WAITLISTED'
      : 'REGISTERED';

    // Use transaction to ensure count stays accurate
    return prisma.$transaction(async (tx) => {
      const enrollment = await tx.enrollment.create({
        data: { eventId, playerId, status },
        include: { player: true, event: true },
      });

      // Only increment if REGISTERED (not waitlisted)
      if (status === 'REGISTERED') {
        await tx.event.update({
          where: { id: eventId },
          data: { currentEnrollment: { increment: 1 } },
        });
      }

      return enrollment;
    });
  },

  async unenroll(eventId: string, enrollmentId: string) {
    // Get enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { event: true },
    });
    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    // Verify it belongs to the correct event
    if (enrollment.eventId !== eventId) {
      throw new Error('Enrollment does not belong to this event');
    }

    // Check event is still editable
    if (!isEventEditable(enrollment.event.startTime)) {
      throw new Error('Event can no longer be modified');
    }

    // Use transaction
    return prisma.$transaction(async (tx) => {
      await tx.enrollment.delete({ where: { id: enrollmentId } });

      // Only decrement if was REGISTERED
      if (enrollment.status === 'REGISTERED') {
        await tx.event.update({
          where: { id: eventId },
          data: { currentEnrollment: { decrement: 1 } },
        });
      }

      return { success: true };
    });
  },
};

export default enrollmentService;
