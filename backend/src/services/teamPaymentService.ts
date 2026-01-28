import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import { stripeService } from './stripeService.js';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
const APP_URL = process.env.APP_URL || 'http://localhost:8081';

/**
 * Team Payment Service
 *
 * PURPOSE: Handle team fee payments for competitions.
 *
 * TWO PAYMENT OPTIONS:
 * 1. FULL - Captain pays entire team fee
 * 2. SPLIT - Each player pays their share (fee ÷ roster size)
 *
 * FLOW:
 * 1. Player requests checkout → Create Stripe session + pending TeamPayment
 * 2. Stripe webhook fires on success → Mark TeamPayment complete
 * 3. Check if team is fully paid → Mark team as CONFIRMED
 */
export const teamPaymentService = {
  /**
   * Calculate the per-player share of the team fee
   */
  calculatePlayerShare(pricePerTeam: number, rosterSize: number): number {
    // Round to 2 decimal places
    return Math.round((pricePerTeam / rosterSize) * 100) / 100;
  },

  /**
   * Get payment status for a team
   *
   * Returns who's paid, who owes, and total amounts
   */
  async getPaymentStatus(teamId: string) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        competition: { select: { pricePerTeam: true } },
        roster: {
          include: {
            player: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        payments: {
          select: {
            id: true,
            playerId: true,
            amount: true,
            paymentType: true,
            status: true,
            paidAt: true,
          },
        },
      },
    });

    if (!team) {
      throw new Error('Team not found');
    }

    const pricePerTeam = Number(team.competition.pricePerTeam);
    const rosterSize = team.roster.length;
    const playerShare = this.calculatePlayerShare(pricePerTeam, rosterSize);

    // Check if captain paid in full
    const fullPayment = team.payments.find(
      (p) => p.paymentType === 'FULL' && p.status === 'COMPLETED'
    );

    if (fullPayment) {
      return {
        teamId: team.id,
        teamStatus: team.status,
        paidInFull: true,
        paidBy: fullPayment.playerId,
        totalAmount: pricePerTeam,
        amountPaid: pricePerTeam,
        amountOwed: 0,
        playerPayments: [],
      };
    }

    // Calculate split payment status
    const playerPayments = team.roster.map((rosterEntry) => {
      const payment = team.payments.find(
        (p) => p.playerId === rosterEntry.playerId && p.status === 'COMPLETED'
      );
      return {
        playerId: rosterEntry.player.id,
        playerName: `${rosterEntry.player.firstName} ${rosterEntry.player.lastName}`,
        email: rosterEntry.player.email,
        amountOwed: playerShare,
        amountPaid: payment ? Number(payment.amount) : 0,
        paid: !!payment,
        paidAt: payment?.paidAt || null,
      };
    });

    const amountPaid = playerPayments.reduce((sum, p) => sum + p.amountPaid, 0);

    return {
      teamId: team.id,
      teamStatus: team.status,
      paidInFull: false,
      totalAmount: pricePerTeam,
      playerShare,
      amountPaid,
      amountOwed: pricePerTeam - amountPaid,
      playerPayments,
      playersRemaining: playerPayments.filter((p) => !p.paid).length,
    };
  },

  /**
   * Create a checkout session for team payment
   *
   * @param teamId - Team to pay for
   * @param playerId - Player making the payment
   * @param paymentType - 'FULL' (captain pays all) or 'SPLIT' (player pays their share)
   */
  async createCheckoutSession(
    teamId: string,
    playerId: string,
    paymentType: 'FULL' | 'SPLIT'
  ) {
    // Get team with competition and roster
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        competition: { select: { id: true, name: true, pricePerTeam: true, status: true, stripeProductId: true } },
        roster: { select: { playerId: true } },
        captain: { select: { id: true } },
      },
    });

    if (!team) {
      throw new Error('Team not found');
    }

    // Validate competition is in REGISTRATION status
    if (team.competition.status !== 'REGISTRATION') {
      throw new Error('Competition is not open for payments');
    }

    // Validate player is on the roster
    const isOnRoster = team.roster.some((r) => r.playerId === playerId);
    if (!isOnRoster) {
      throw new Error('Player is not on this team');
    }

    // Only captain can pay FULL
    if (paymentType === 'FULL' && team.captain.id !== playerId) {
      throw new Error('Only the team captain can pay the full amount');
    }

    // Check if already paid
    const existingPayment = await prisma.teamPayment.findFirst({
      where: {
        teamId,
        playerId,
        status: 'COMPLETED',
      },
    });

    if (existingPayment) {
      throw new Error('Player has already paid for this team');
    }

    // Check if team is already fully paid (someone paid FULL)
    const fullPayment = await prisma.teamPayment.findFirst({
      where: {
        teamId,
        paymentType: 'FULL',
        status: 'COMPLETED',
      },
    });

    if (fullPayment) {
      throw new Error('Team has already been paid in full');
    }

    // Calculate amount
    const pricePerTeam = Number(team.competition.pricePerTeam);
    const amount = paymentType === 'FULL'
      ? pricePerTeam
      : this.calculatePlayerShare(pricePerTeam, team.roster.length);

    // Get player info for Stripe
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        stripeCustomerId: true,
      },
    });

    if (!player) {
      throw new Error('Player not found');
    }

    // Get or create Stripe customer
    const customerId = await stripeService.getOrCreateCustomer(
      player.id,
      player.email,
      `${player.firstName} ${player.lastName}`,
      player.stripeCustomerId
    );

    // Update player with Stripe customer ID if new
    if (!player.stripeCustomerId) {
      await prisma.player.update({
        where: { id: player.id },
        data: { stripeCustomerId: customerId },
      });
    }

    // Build price_data - use existing Stripe product if available for better reporting
    const priceData: Stripe.Checkout.SessionCreateParams.LineItem.PriceData = {
      currency: 'usd',
      unit_amount: Math.round(amount * 100), // Stripe uses cents
      ...(team.competition.stripeProductId
        ? { product: team.competition.stripeProductId }
        : {
            product_data: {
              name: `${team.competition.name} - Team Fee`,
              description: paymentType === 'FULL'
                ? `Full team payment for ${team.name}`
                : `Your share for team ${team.name}`,
            },
          }),
    };

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: priceData,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${APP_URL}/competitions/${team.competition.id}/teams/${teamId}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/competitions/${team.competition.id}/teams/${teamId}`,
      payment_intent_data: {
        description: paymentType === 'FULL'
          ? `Full team payment for ${team.name}`
          : `${team.name} - Player share`,
      },
      metadata: {
        type: 'team_payment', // Used by webhook to identify this payment type
        teamId,
        playerId,
        paymentType,
        competitionId: team.competition.id,
      },
    });

    // Create pending TeamPayment record
    await prisma.teamPayment.create({
      data: {
        teamId,
        playerId,
        amount,
        paymentType,
        stripeSessionId: session.id,
        status: 'PENDING',
      },
    });

    return {
      url: session.url,
      sessionId: session.id,
      amount,
      paymentType,
    };
  },

  /**
   * Handle successful payment (called by webhook)
   *
   * 1. Mark TeamPayment as COMPLETED
   * 2. Check if team is fully paid
   * 3. If fully paid, update team status to CONFIRMED
   */
  async handlePaymentComplete(stripeSessionId: string) {
    // Find the pending payment
    const payment = await prisma.teamPayment.findUnique({
      where: { stripeSessionId },
      include: {
        team: {
          include: {
            roster: { select: { playerId: true } },
            competition: { select: { pricePerTeam: true } },
          },
        },
      },
    });

    if (!payment) {
      console.error('No TeamPayment found for session:', stripeSessionId);
      return;
    }

    if (payment.status === 'COMPLETED') {
      console.log('TeamPayment already completed:', stripeSessionId);
      return;
    }

    // Mark payment as completed
    await prisma.teamPayment.update({
      where: { id: payment.id },
      data: {
        status: 'COMPLETED',
        paidAt: new Date(),
      },
    });

    console.log('TeamPayment completed:', {
      teamId: payment.teamId,
      playerId: payment.playerId,
      paymentType: payment.paymentType,
      amount: payment.amount,
    });

    // Check if team is now fully paid
    const isFullyPaid = await this.checkTeamFullyPaid(payment.teamId);

    if (isFullyPaid) {
      // Update team status to CONFIRMED and set paidInFull if applicable
      await prisma.team.update({
        where: { id: payment.teamId },
        data: {
          status: 'CONFIRMED',
          paidInFull: payment.paymentType === 'FULL',
        },
      });

      console.log('Team confirmed:', payment.teamId);
    }
  },

  /**
   * Check if a team has been fully paid
   *
   * Fully paid means either:
   * - Someone paid FULL, OR
   * - All roster players have paid their SPLIT share
   */
  async checkTeamFullyPaid(teamId: string): Promise<boolean> {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        roster: { select: { playerId: true } },
        payments: {
          where: { status: 'COMPLETED' },
          select: { playerId: true, paymentType: true },
        },
      },
    });

    if (!team) return false;

    // Check for FULL payment
    const hasFullPayment = team.payments.some((p) => p.paymentType === 'FULL');
    if (hasFullPayment) return true;

    // Check if all roster players have paid
    const paidPlayerIds = new Set(team.payments.map((p) => p.playerId));
    const allPaid = team.roster.every((r) => paidPlayerIds.has(r.playerId));

    return allPaid;
  },

  /**
   * Handle expired checkout (called by webhook)
   */
  async handlePaymentExpired(stripeSessionId: string) {
    const payment = await prisma.teamPayment.findUnique({
      where: { stripeSessionId },
    });

    if (payment && payment.status === 'PENDING') {
      await prisma.teamPayment.delete({
        where: { id: payment.id },
      });
      console.log('TeamPayment expired and deleted:', stripeSessionId);
    }
  },
};

export default teamPaymentService;
