-- DropForeignKey
ALTER TABLE "Breakpoints" DROP CONSTRAINT "Breakpoints_buildId_fkey";

-- AlterTable
ALTER TABLE "Build" ADD COLUMN     "breakpoints" TEXT NOT NULL DEFAULT '[]';
