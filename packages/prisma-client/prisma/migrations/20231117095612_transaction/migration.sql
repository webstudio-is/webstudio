-- DropIndex
DROP INDEX "ClientReferences_userId_service_key";

-- AlterTable
ALTER TABLE "ClientReferences" DROP CONSTRAINT "ClientReferences_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "ClientReferences_pkey" PRIMARY KEY ("userId", "service");

-- CreateTable
CREATE TABLE "TransactionLog" (
    "eventId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "TransactionLog_eventId_productId_key" ON "TransactionLog"("eventId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionLog_sessionId_productId_key" ON "TransactionLog"("sessionId", "productId");

-- AddForeignKey
ALTER TABLE "TransactionLog" ADD CONSTRAINT "TransactionLog_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionLog" ADD CONSTRAINT "TransactionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
