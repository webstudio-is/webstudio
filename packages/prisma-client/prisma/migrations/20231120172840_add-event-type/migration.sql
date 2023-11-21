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

-- DropIndex
DROP INDEX "TransactionLog_sessionId_productId_key";


CREATE VIEW "UserProduct" AS
SELECT "userId", "subscriptionId", "productId", "customerId", "customerEmail"
FROM "TransactionLog" AS tl
WHERE "status" = 'paid'
  AND NOT EXISTS (
    SELECT 1
    FROM "TransactionLog" AS tlexsists
    WHERE tlexsists."subscriptionId" = tl."subscriptionId"
      AND tlexsists."status" = 'canceled'
      AND tlexsists."eventCreated" > tl."eventCreated"
  )
ORDER BY "userId", "eventCreated" DESC;
