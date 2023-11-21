-- AlterTable
ALTER TABLE "TransactionLog" ADD COLUMN     "eventType" TEXT NOT NULL DEFAULT 'checkout.session.completed';

ALTER TABLE "TransactionLog"
ALTER COLUMN "eventType" DROP DEFAULT;