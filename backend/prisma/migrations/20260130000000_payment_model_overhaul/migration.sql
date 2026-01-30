-- AlterTable: Competition - backfill nulls, then make deposit required with default
UPDATE "Competition" SET "deposit" = 0 WHERE "deposit" IS NULL;
ALTER TABLE "Competition" ALTER COLUMN "deposit" SET DEFAULT 0;
ALTER TABLE "Competition" ALTER COLUMN "deposit" SET NOT NULL;
ALTER TABLE "Competition" ADD COLUMN "earlyBirdDiscount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "Competition" ADD COLUMN "earlyBirdDeadline" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Competition" ADD COLUMN "depositDeadline" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable: Team - add depositPaid flag
ALTER TABLE "Team" ADD COLUMN "depositPaid" BOOLEAN NOT NULL DEFAULT false;

-- CreateEnum: TeamPaymentCategory
CREATE TYPE "TeamPaymentCategory" AS ENUM ('DEPOSIT', 'TEAM_FEE');

-- AlterTable: TeamPayment - add category
ALTER TABLE "TeamPayment" ADD COLUMN "category" "TeamPaymentCategory" NOT NULL DEFAULT 'TEAM_FEE';
