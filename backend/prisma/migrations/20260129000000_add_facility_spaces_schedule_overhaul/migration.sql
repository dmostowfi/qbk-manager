-- CreateEnum
CREATE TYPE "SpaceType" AS ENUM ('COURT', 'OPEN_AREA', 'GAMES');

-- CreateEnum
CREATE TYPE "MatchType" AS ENUM ('REGULAR', 'EXHIBITION', 'PLAYOFF');

-- CreateTable
CREATE TABLE "Facility" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Facility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Space" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SpaceType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Space_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Space" ADD CONSTRAINT "Space_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed facility and spaces
INSERT INTO "Facility" ("id", "name", "updatedAt") VALUES
  ('default-facility', 'QBK', CURRENT_TIMESTAMP);
INSERT INTO "Space" ("id", "facilityId", "name", "type", "updatedAt") VALUES
  ('court-l', 'default-facility', 'L', 'COURT', CURRENT_TIMESTAMP),
  ('court-c', 'default-facility', 'C', 'COURT', CURRENT_TIMESTAMP),
  ('court-r', 'default-facility', 'R', 'COURT', CURRENT_TIMESTAMP);

-- Event: migrate courtId Int -> spaceId String (FK to Space)
-- Step 1: Add nullable spaceId column
ALTER TABLE "Event" ADD COLUMN "spaceId" TEXT;

-- Step 2: Migrate existing data (courtId 1->L, 2->C, 3->R)
UPDATE "Event" SET "spaceId" = CASE
  WHEN "courtId" = 1 THEN 'court-l'
  WHEN "courtId" = 2 THEN 'court-c'
  WHEN "courtId" = 3 THEN 'court-r'
  ELSE 'court-l'
END;

-- Step 3: Make spaceId NOT NULL and drop courtId
ALTER TABLE "Event" ALTER COLUMN "spaceId" SET NOT NULL;
ALTER TABLE "Event" DROP COLUMN "courtId";

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Match: migrate isPlayoff Boolean -> matchType MatchType + add exhibitionForTeamId
-- Step 1: Add new columns
ALTER TABLE "Match" ADD COLUMN "matchType" "MatchType" NOT NULL DEFAULT 'REGULAR';
ALTER TABLE "Match" ADD COLUMN "exhibitionForTeamId" TEXT;

-- Step 2: Migrate existing data
UPDATE "Match" SET "matchType" = 'PLAYOFF' WHERE "isPlayoff" = true;

-- Step 3: Drop old column
ALTER TABLE "Match" DROP COLUMN "isPlayoff";

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_exhibitionForTeamId_fkey" FOREIGN KEY ("exhibitionForTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Competition: add numberOfWeeks and deposit
ALTER TABLE "Competition" ADD COLUMN "deposit" DECIMAL(10,2);
ALTER TABLE "Competition" ADD COLUMN "numberOfWeeks" INTEGER;

-- Competition-Space many-to-many join table
CREATE TABLE "_CompetitionToSpace" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

CREATE UNIQUE INDEX "_CompetitionToSpace_AB_unique" ON "_CompetitionToSpace"("A", "B");
CREATE INDEX "_CompetitionToSpace_B_index" ON "_CompetitionToSpace"("B");

ALTER TABLE "_CompetitionToSpace" ADD CONSTRAINT "_CompetitionToSpace_A_fkey" FOREIGN KEY ("A") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_CompetitionToSpace" ADD CONSTRAINT "_CompetitionToSpace_B_fkey" FOREIGN KEY ("B") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Rename foreign key constraints (from home/away to team1/team2 naming)
ALTER TABLE "Match" RENAME CONSTRAINT "Match_homeTeamId_fkey" TO "Match_team1Id_fkey";
ALTER TABLE "Match" RENAME CONSTRAINT "Match_awayTeamId_fkey" TO "Match_team2Id_fkey";
