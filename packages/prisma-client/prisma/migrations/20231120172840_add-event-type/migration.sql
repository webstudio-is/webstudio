-- AlterTable
ALTER TABLE "TransactionLog" ADD COLUMN     "eventType" TEXT NOT NULL DEFAULT 'checkout.session.completed';

ALTER TABLE "TransactionLog"
ALTER COLUMN "eventType" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TransactionLog" ADD COLUMN     "eventCreated" INTEGER NOT NULL DEFAULT 0;
-- Fill Initally
UPDATE "TransactionLog" SET "eventCreated" = EXTRACT(EPOCH FROM "createdAt");

ALTER TABLE "TransactionLog"
ALTER COLUMN "eventCreated" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TransactionLog" ADD CONSTRAINT "TransactionLog_pkey" PRIMARY KEY ("eventId");
