-- Rename home/away columns to team1/team2 in Match table
ALTER TABLE "Match" RENAME COLUMN "homeTeamId" TO "team1Id";
ALTER TABLE "Match" RENAME COLUMN "awayTeamId" TO "team2Id";
ALTER TABLE "Match" RENAME COLUMN "homeScore" TO "team1Score";
ALTER TABLE "Match" RENAME COLUMN "awayScore" TO "team2Score";
