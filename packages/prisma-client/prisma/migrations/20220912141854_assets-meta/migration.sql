-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "description" TEXT,
ADD COLUMN     "meta" TEXT NOT NULL DEFAULT '{}';
