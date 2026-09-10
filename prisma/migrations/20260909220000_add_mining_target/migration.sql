-- AlterTable
ALTER TABLE "meta_status" ADD COLUMN     "miningTarget" TEXT NOT NULL DEFAULT 'quiz';
ALTER TABLE "meta_status" ADD COLUMN     "keywordCursorQuiz" INTEGER NOT NULL DEFAULT 0;
