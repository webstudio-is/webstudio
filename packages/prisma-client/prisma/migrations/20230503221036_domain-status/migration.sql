-- CreateEnum
CREATE TYPE "DomainStatus" AS ENUM ('INITIALIZING', 'ACTIVE', 'ERROR', 'PENDING');

-- AlterTable
ALTER TABLE "Domain" DROP COLUMN "status",
ADD COLUMN     "status" "DomainStatus" NOT NULL DEFAULT 'INITIALIZING';
