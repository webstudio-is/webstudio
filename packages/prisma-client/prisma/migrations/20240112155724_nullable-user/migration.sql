-- DropForeignKey
ALTER TABLE "TransactionLog" DROP CONSTRAINT "TransactionLog_userId_fkey";

-- AlterTable
ALTER TABLE "TransactionLog" ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "TransactionLog" ADD CONSTRAINT "TransactionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
