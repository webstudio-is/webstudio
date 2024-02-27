-- CreateEnum
CREATE TYPE "MarketplaceStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE
  "Build"
ADD
  COLUMN "marketplaceProduct" TEXT NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE
  "Project"
ADD
  COLUMN "marketplaceStatus" "PublishStatus";