-- AlterTable
ALTER TABLE "TransactionLog" ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "subscriptionId" TEXT,
ADD COLUMN     "customerEmail" TEXT;
