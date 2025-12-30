-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "MembershipType" AS ENUM ('GOLD', 'DROP_IN', 'NONE');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('MEMBERSHIP_GOLD', 'MEMBERSHIP_DROPIN', 'CLASS_PACK', 'SINGLE_CLASS', 'SINGLE_DROP_IN');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('REGISTERED', 'WAITLISTED', 'CANCELLED', 'ATTENDED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('CLASS', 'OPEN_PLAY', 'PRIVATE_EVENT', 'TOURNAMENT', 'LEAGUE', 'OTHER');

-- CreateEnum
CREATE TYPE "SkillLevel" AS ENUM ('INTRO_I', 'INTRO_II', 'INTRO_III', 'INTRO_IV', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "GenderCategory" AS ENUM ('MENS', 'WOMENS', 'COED');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('SCHEDULED', 'CANCELLED', 'COMPLETED');

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "streetAddress" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "membershipType" "MembershipType" NOT NULL DEFAULT 'NONE',
    "membershipStatus" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "statusUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "classCredits" INTEGER NOT NULL DEFAULT 0,
    "dropInCredits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "eventType" "EventType" NOT NULL,
    "courtId" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "maxCapacity" INTEGER NOT NULL DEFAULT 12,
    "currentEnrollment" INTEGER NOT NULL DEFAULT 0,
    "instructor" TEXT,
    "level" "SkillLevel" NOT NULL,
    "gender" "GenderCategory" NOT NULL,
    "isYouth" BOOLEAN NOT NULL DEFAULT false,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "status" "EventStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'REGISTERED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "transactionType" "TransactionType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "classCredits" INTEGER NOT NULL DEFAULT 0,
    "dropInCredits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STAFF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_clerkId_key" ON "Player"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "Player_email_key" ON "Player"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_playerId_eventId_key" ON "Enrollment"("playerId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
