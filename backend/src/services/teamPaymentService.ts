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
 * TWO PAYMENT CATEGORIES:
 * 1. DEPOSIT - Required before schedule generation
 * 2. TEAM_FEE - Remaining balance after deposit
 *
 * TWO PAYMENT TYPES:
 * 1. FULL - Captain pays entire amount for the category
 * 2. SPLIT - Each player pays their share (amount ÷ roster size)
 *
 * FLOW:
 * 1. Player requests checkout → Create Stripe session + pending TeamPayment
 * 2. Stripe webhook fires on success → Mark TeamPayment complete
 * 3. Check deposit/total thresholds → Update team depositPaid/status
 */
export const teamPaymentService = {
  /**
   * Calculate the effective team fee (with early bird discount if applicable)
   */
  calculateEffectiveFee(
    pricePerTeam: number,
    earlyBirdDiscount: number,
    depositPaidAt: Date | null,
    earlyBirdDeadline: Date
  ): { effectiveFee: number; earlyBirdApplied: boolean } {
    const earlyBirdApplied = !!depositPaidAt && depositPaidAt <= earlyBirdDeadline;
    const effectiveFee = earlyBirdApplied
      ? pricePerTeam - earlyBirdDiscount
      : pricePerTeam;
    return { effectiveFee, earlyBirdApplied };
  },

  /**
   * Get the earliest deposit payment date for a team
   */
  async getDepositPaidDate(teamId: string): Promise<Date | null> {
    const firstDeposit = await prisma.teamPayment.findFirst({
      where: {
        teamId,
        category: 'DEPOSIT',
        status: 'COMPLETED',
      },
      orderBy: { paidAt: 'asc' },
      select: { paidAt: true },
    });
    return firstDeposit?.paidAt ?? null;
  },

  /**
   * Get payment status for a team
   *
   * Returns deposit status, effective fee, early bird info, and per-player breakdown
   */
  async getPaymentStatus(teamId: string) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        competition: {
          select: {
            pricePerTeam: true,
            deposit: true,
            earlyBirdDiscount: true,
            earlyBirdDeadline: true,
          },
        },
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
            category: true,
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
    const depositAmount = Number(team.competition.deposit);
    const earlyBirdDiscount = Number(team.competition.earlyBirdDiscount);
    const earlyBirdDeadline = team.competition.earlyBirdDeadline;
    const rosterSize = team.roster.length;

    // Get deposit paid date for early bird calculation
    const depositPaidAt = await this.getDepositPaidDate(teamId);
    const { effectiveFee, earlyBirdApplied } = this.calculateEffectiveFee(
      pricePerTeam,
      earlyBirdDiscount,
      depositPaidAt,
      earlyBirdDeadline
    );

    // Sum completed payments
    const completedPayments = team.payments.filter((p) => p.status === 'COMPLETED');
    const totalPaid = completedPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const depositPaid = completedPayments
      .filter((p) => p.category === 'DEPOSIT')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const balanceRemaining = Math.max(0, effectiveFee - totalPaid);

    // Per-player breakdown
    const playerPayments = team.roster.map((rosterEntry) => {
      const playerCompletedPayments = completedPayments.filter(
        (p) => p.playerId === rosterEntry.playerId
      );
      const amountPaid = playerCompletedPayments.reduce((sum, p) => sum + Number(p.amount), 0);

      return {
        playerId: rosterEntry.player.id,
        playerName: `${rosterEntry.player.firstName} ${rosterEntry.player.lastName}`,
        email: rosterEntry.player.email,
        amountPaid,
        paid: amountPaid > 0,
        paidAt: playerCompletedPayments[0]?.paidAt?.toISOString() || null,
        categories: playerCompletedPayments.map((p) => p.category),
      };
    });

    return {
      teamId: team.id,
      teamStatus: team.status,
      paidInFull: team.paidInFull,
      depositPaid: team.depositPaid,
      depositAmount,
      effectiveFee,
      earlyBirdApplied,
      balanceRemaining,
      totalAmount: effectiveFee,
      amountPaid: totalPaid,
      amountOwed: balanceRemaining,
      playerPayments,
    };
  },

  /**
   * Create a checkout session for team payment
   *
   * @param teamId - Team to pay for
   * @param playerId - Player making the payment
   * @param paymentType - 'FULL' (captain pays all) or 'SPLIT' (player pays their share)
   * @param category - 'DEPOSIT' or 'TEAM_FEE'
   */
  async createCheckoutSession(
    teamId: string,
    playerId: string,
    paymentType: 'FULL' | 'SPLIT',
    category: 'DEPOSIT' | 'TEAM_FEE'
  ) {
    // Get team with competition and roster
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        competition: {
          select: {
            id: true,
            name: true,
            pricePerTeam: true,
            deposit: true,
            earlyBirdDiscount: true,
            earlyBirdDeadline: true,
            status: true,
            stripeProductId: true,
          },
        },
        roster: { select: { playerId: true } },
        captain: { select: { id: true } },
      },
    });

    if (!team) {
      throw new Error('Team not found');
    }

    // Allow payments during REGISTRATION and ACTIVE
    if (team.competition.status !== 'REGISTRATION' && team.competition.status !== 'ACTIVE') {
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

    // Calculate amount
    const pricePerTeam = Number(team.competition.pricePerTeam);
    const depositAmount = Number(team.competition.deposit);
    const earlyBirdDiscount = Number(team.competition.earlyBirdDiscount);
    const earlyBirdDeadline = team.competition.earlyBirdDeadline;
    const rosterSize = team.roster.length;

    let amount: number;

    if (category === 'DEPOSIT') {
      amount = paymentType === 'FULL'
        ? depositAmount
        : Math.round((depositAmount / rosterSize) * 100) / 100;
    } else {
      // TEAM_FEE - calculate effective fee with early bird
      const depositPaidAt = await this.getDepositPaidDate(teamId);
      const { effectiveFee } = this.calculateEffectiveFee(
        pricePerTeam,
        earlyBirdDiscount,
        depositPaidAt,
        earlyBirdDeadline
      );
      // Team fee is effective fee minus the deposit already paid
      const teamFeeBalance = effectiveFee - depositAmount;
      amount = paymentType === 'FULL'
        ? teamFeeBalance
        : Math.round((teamFeeBalance / rosterSize) * 100) / 100;
    }

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

    const categoryLabel = category === 'DEPOSIT' ? 'Deposit' : 'Team Fee';
    const description = paymentType === 'FULL'
      ? `Full ${categoryLabel.toLowerCase()} for ${team.name}`
      : `${categoryLabel} share for team ${team.name}`;

    // Build price_data
    const priceData: Stripe.Checkout.SessionCreateParams.LineItem.PriceData = {
      currency: 'usd',
      unit_amount: Math.round(amount * 100),
      ...(team.competition.stripeProductId
        ? { product: team.competition.stripeProductId }
        : {
            product_data: {
              name: `${team.competition.name} - ${categoryLabel}`,
              description,
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
        description,
      },
      metadata: {
        type: 'team_payment',
        teamId,
        playerId,
        paymentType,
        category,
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
        category,
        stripeSessionId: session.id,
        status: 'PENDING',
      },
    });

    return {
      url: session.url,
      sessionId: session.id,
      amount,
      paymentType,
      category,
    };
  },

  /**
   * Handle successful payment (called by webhook)
   *
   * 1. Mark TeamPayment as COMPLETED
   * 2. Check deposit threshold → set team.depositPaid
   * 3. Check total paid threshold → set team CONFIRMED + paidInFull
   */
  async handlePaymentComplete(stripeSessionId: string) {
    // Find the pending payment
    const payment = await prisma.teamPayment.findUnique({
      where: { stripeSessionId },
      include: {
        team: {
          include: {
            roster: { select: { playerId: true } },
            competition: {
              select: {
                pricePerTeam: true,
                deposit: true,
                earlyBirdDiscount: true,
                earlyBirdDeadline: true,
              },
            },
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
      category: payment.category,
      amount: payment.amount,
    });

    const teamId = payment.teamId;
    const competition = payment.team.competition;
    const depositAmount = Number(competition.deposit);
    const pricePerTeam = Number(competition.pricePerTeam);
    const earlyBirdDiscount = Number(competition.earlyBirdDiscount);
    const earlyBirdDeadline = competition.earlyBirdDeadline;

    // Get all completed payments for this team
    const completedPayments = await prisma.teamPayment.findMany({
      where: { teamId, status: 'COMPLETED' },
      select: { amount: true, category: true, paidAt: true },
    });

    // 1. Check deposit threshold
    const depositPaidTotal = completedPayments
      .filter((p) => p.category === 'DEPOSIT')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    if (depositPaidTotal >= depositAmount) {
      await prisma.team.update({
        where: { id: teamId },
        data: { depositPaid: true },
      });
      console.log('Team deposit paid:', teamId);
    }

    // 2. Check total payment threshold
    const depositPaidAt = await this.getDepositPaidDate(teamId);
    const { effectiveFee } = this.calculateEffectiveFee(
      pricePerTeam,
      earlyBirdDiscount,
      depositPaidAt,
      earlyBirdDeadline
    );

    const totalPaid = completedPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    if (totalPaid >= effectiveFee) {
      await prisma.team.update({
        where: { id: teamId },
        data: {
          status: 'CONFIRMED',
          paidInFull: true,
        },
      });
      console.log('Team confirmed:', teamId);
    }
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
