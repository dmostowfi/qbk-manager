import { PrismaClient, Prisma } from '@prisma/client';
import { isEventEditable } from '../utils/eventUtils.js';

const prisma = new PrismaClient();

// Credit calculation helper
function calculateCreditsNeeded(membershipType: string, eventType: string) {
  // GOLD: unlimited everything
  if (membershipType === 'GOLD') {
    return { classCredits: 0, dropInCredits: 0 };
  }

  // DROP_IN: unlimited open play, pay for classes
  if (membershipType === 'DROP_IN') {
    return {
      classCredits: eventType === 'CLASS' ? 1 : 0,
      dropInCredits: 0,
    };
  }

  // NONE: pay for everything
  return {
    classCredits: eventType === 'CLASS' ? 1 : 0,
    dropInCredits: eventType === 'OPEN_PLAY' ? 1 : 0,
  };
}

export const enrollmentService = {
  async enroll(eventId: string, playerIds: string[]) {
    // Get event and check it exists
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new Error('Event not found');
    }

    // Check event is still editable
    if (!isEventEditable(event.startTime)) {
      throw new Error('Event can no longer be modified');
    }

    // Use transaction to ensure all enrollments succeed or fail together
    return prisma.$transaction(async (tx) => {
      const enrollments = [];
      let currentCount = event.currentEnrollment;

      for (const playerId of playerIds) {
        // Check player exists
        const player = await tx.player.findUnique({ where: { id: playerId } });
        if (!player) {
          throw new Error(`Player ${playerId} not found`);
        }

        // Check player isn't already enrolled
        const existingEnrollment = await tx.enrollment.findUnique({
          where: { playerId_eventId: { playerId, eventId } },
        });
        if (existingEnrollment) {
          throw new Error(`Player ${player.email} is already enrolled in this event`);
        }

        // Calculate credits needed
        const creditsNeeded = calculateCreditsNeeded(player.membershipType, event.eventType);

        // Validate sufficient credits
        if (creditsNeeded.classCredits > player.classCredits) {
          throw new Error(`Player ${player.email} has insufficient class credits`);
        }
        if (creditsNeeded.dropInCredits > player.dropInCredits) {
          throw new Error(`Player ${player.email} has insufficient drop-in credits`);
        }

        // Determine status based on capacity
        const status = currentCount >= event.maxCapacity ? 'WAITLISTED' : 'REGISTERED';

        // Create enrollment
        const enrollment = await tx.enrollment.create({
          data: { eventId, playerId, status },
          include: { player: true, event: true },
        });

        // Decrement credits if needed
        if (creditsNeeded.classCredits > 0 || creditsNeeded.dropInCredits > 0) {
          await tx.player.update({
            where: { id: playerId },
            data: {
              classCredits: { decrement: creditsNeeded.classCredits },
              dropInCredits: { decrement: creditsNeeded.dropInCredits },
            },
          });
        }

        // Increment event enrollment count if REGISTERED
        if (status === 'REGISTERED') {
          await tx.event.update({
            where: { id: eventId },
            data: { currentEnrollment: { increment: 1 } },
          });
          currentCount++;
        }

        enrollments.push(enrollment);
      }

      return enrollments;
    });
  },

  async unenroll(eventId: string, enrollmentIds: string[]) {
    // Use transaction to ensure all unenrollments succeed or fail together
    return prisma.$transaction(async (tx) => {
      for (const enrollmentId of enrollmentIds) {
        // Get enrollment with player and event
        const enrollment = await tx.enrollment.findUnique({
          where: { id: enrollmentId },
          include: { player: true, event: true },
        });
        if (!enrollment) {
          throw new Error(`Enrollment ${enrollmentId} not found`);
        }

        // Verify it belongs to the correct event
        if (enrollment.eventId !== eventId) {
          throw new Error('Enrollment does not belong to this event');
        }

        // Check event is still editable
        if (!isEventEditable(enrollment.event.startTime)) {
          throw new Error('Event can no longer be modified');
        }

        // Calculate credits to refund
        const creditsToRefund = calculateCreditsNeeded(
          enrollment.player.membershipType,
          enrollment.event.eventType
        );

        // Delete enrollment
        await tx.enrollment.delete({ where: { id: enrollmentId } });

        // Refund credits if needed
        if (creditsToRefund.classCredits > 0 || creditsToRefund.dropInCredits > 0) {
          await tx.player.update({
            where: { id: enrollment.playerId },
            data: {
              classCredits: { increment: creditsToRefund.classCredits },
              dropInCredits: { increment: creditsToRefund.dropInCredits },
            },
          });
        }

        // Decrement event enrollment count if was REGISTERED
        if (enrollment.status === 'REGISTERED') {
          await tx.event.update({
            where: { id: eventId },
            data: { currentEnrollment: { decrement: 1 } },
          });
        }
      }

      return { success: true };
    });
  },
};

export default enrollmentService;
