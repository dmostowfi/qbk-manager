-- Player: add fields that were added via db push
ALTER TABLE "Player" ADD COLUMN "tosAcceptedAt" TIMESTAMP(3);
ALTER TABLE "Player" ADD COLUMN "privacyAcceptedAt" TIMESTAMP(3);
ALTER TABLE "Player" ADD COLUMN "waiverSignedAt" TIMESTAMP(3);
ALTER TABLE "Player" ADD COLUMN "profileCompletedAt" TIMESTAMP(3);
ALTER TABLE "Player" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "Player" ADD COLUMN "stripeSubscriptionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Player_stripeCustomerId_key" ON "Player"("stripeCustomerId");
CREATE UNIQUE INDEX "Player_stripeSubscriptionId_key" ON "Player"("stripeSubscriptionId");

-- Transaction: restructure - drop old columns first
ALTER TABLE "Transaction" DROP COLUMN "transactionType";
ALTER TABLE "Transaction" DROP COLUMN "classCredits";
ALTER TABLE "Transaction" DROP COLUMN "dropInCredits";

-- Drop old TransactionType enum
DROP TYPE "TransactionType";

-- Add new transaction columns
ALTER TABLE "Transaction" ADD COLUMN "stripeProductId" TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE "Transaction" ADD COLUMN "productName" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "stripeSessionId" TEXT;

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

ALTER TABLE "Transaction" ADD COLUMN "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING';

-- Remove default from stripeProductId
ALTER TABLE "Transaction" ALTER COLUMN "stripeProductId" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_stripeSessionId_key" ON "Transaction"("stripeSessionId");

-- ============== COMPETITION ENUMS ==============

CREATE TYPE "CompetitionType" AS ENUM ('LEAGUE', 'TOURNAMENT');
CREATE TYPE "CompetitionFormat" AS ENUM ('INTERMEDIATE_4S', 'RECREATIONAL_6S');
CREATE TYPE "CompetitionStatus" AS ENUM ('DRAFT', 'REGISTRATION', 'ACTIVE', 'COMPLETED');
CREATE TYPE "TeamStatus" AS ENUM ('PENDING', 'CONFIRMED');
CREATE TYPE "FreeAgentStatus" AS ENUM ('SEARCHING', 'ASSIGNED');
CREATE TYPE "TeamPaymentType" AS ENUM ('FULL', 'SPLIT');
CREATE TYPE "TeamPaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'REFUNDED');

-- ============== COMPETITION MODELS ==============

-- Competition
CREATE TABLE "Competition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CompetitionType" NOT NULL,
    "format" "CompetitionFormat" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "pricePerTeam" DECIMAL(10,2) NOT NULL,
    "maxTeams" INTEGER NOT NULL DEFAULT 8,
    "status" "CompetitionStatus" NOT NULL DEFAULT 'DRAFT',
    "registrationDeadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Competition_pkey" PRIMARY KEY ("id")
);

-- Team
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "captainId" TEXT NOT NULL,
    "status" "TeamStatus" NOT NULL DEFAULT 'PENDING',
    "paidInFull" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- TeamRoster
CREATE TABLE "TeamRoster" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamRoster_pkey" PRIMARY KEY ("id")
);

-- Match (with home/away naming - will be renamed in later migration)
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "homeTeamId" TEXT NOT NULL,
    "awayTeamId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "isPlayoff" BOOLEAN NOT NULL DEFAULT false,
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- FreeAgent
CREATE TABLE "FreeAgent" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "status" "FreeAgentStatus" NOT NULL DEFAULT 'SEARCHING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FreeAgent_pkey" PRIMARY KEY ("id")
);

-- TeamPayment
CREATE TABLE "TeamPayment" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentType" "TeamPaymentType" NOT NULL,
    "stripeSessionId" TEXT,
    "status" "TeamPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamPayment_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX "Team_competitionId_name_key" ON "Team"("competitionId", "name");
CREATE UNIQUE INDEX "TeamRoster_teamId_playerId_key" ON "TeamRoster"("teamId", "playerId");
CREATE UNIQUE INDEX "Match_eventId_key" ON "Match"("eventId");
CREATE UNIQUE INDEX "FreeAgent_competitionId_playerId_key" ON "FreeAgent"("competitionId", "playerId");
CREATE UNIQUE INDEX "TeamPayment_stripeSessionId_key" ON "TeamPayment"("stripeSessionId");

-- Indexes
CREATE INDEX "Match_competitionId_roundNumber_idx" ON "Match"("competitionId", "roundNumber");
CREATE INDEX "TeamPayment_teamId_idx" ON "TeamPayment"("teamId");

-- Foreign Keys
ALTER TABLE "Team" ADD CONSTRAINT "Team_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Team" ADD CONSTRAINT "Team_captainId_fkey" FOREIGN KEY ("captainId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeamRoster" ADD CONSTRAINT "TeamRoster_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamRoster" ADD CONSTRAINT "TeamRoster_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Match" ADD CONSTRAINT "Match_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Match" ADD CONSTRAINT "Match_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Match" ADD CONSTRAINT "Match_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Match" ADD CONSTRAINT "Match_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FreeAgent" ADD CONSTRAINT "FreeAgent_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FreeAgent" ADD CONSTRAINT "FreeAgent_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeamPayment" ADD CONSTRAINT "TeamPayment_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeamPayment" ADD CONSTRAINT "TeamPayment_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
