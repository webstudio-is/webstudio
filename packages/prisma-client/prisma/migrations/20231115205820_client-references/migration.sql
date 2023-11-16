CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateTable
CREATE TABLE "ClientReferences" (
    "id" TEXT NOT NULL DEFAULT uuid_generate_v4(),
    "reference" TEXT NOT NULL DEFAULT uuid_generate_v4(),
    "service" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ClientReferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientReferences_userId_service_key" ON "ClientReferences"("userId", "service");

-- CreateIndex
CREATE UNIQUE INDEX "ClientReferences_reference_service_key" ON "ClientReferences"("reference", "service");

-- AddForeignKey
ALTER TABLE "ClientReferences" ADD CONSTRAINT "ClientReferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
