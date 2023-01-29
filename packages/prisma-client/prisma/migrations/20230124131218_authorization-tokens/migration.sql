-- CreateEnum
CREATE TYPE "AuthorizationPermit" AS ENUM ('VIEW', 'EDIT');

-- CreateTable
CREATE TABLE "AuthorizationTokens" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "permit" "AuthorizationPermit" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthorizationTokens_pkey" PRIMARY KEY ("id")
);
