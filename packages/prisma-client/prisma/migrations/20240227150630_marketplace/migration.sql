-- CreateEnum
CREATE TYPE "MarketplaceApprovalStatus" AS ENUM ('UNLISTED', 'PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE
  "Build"
ADD
  COLUMN "marketplaceProduct" TEXT NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE
  "Project"
ADD
  COLUMN "marketplaceApprovalStatus" "MarketplaceApprovalStatus" NOT NULL DEFAULT 'UNLISTED';