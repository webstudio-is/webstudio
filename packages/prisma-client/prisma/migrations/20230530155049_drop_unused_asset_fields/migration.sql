-- AlterTable
ALTER TABLE "Asset" DROP COLUMN "createdAt",
DROP COLUMN "description",
DROP COLUMN "format",
DROP COLUMN "location",
DROP COLUMN "meta",
DROP COLUMN "size",
DROP COLUMN "status";

-- DropEnum
DROP TYPE "Location";
