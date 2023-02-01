-- CreateEnum
CREATE TYPE "AuthorizationRelation" AS ENUM ('viewers', 'editors', 'builders');

-- DropTable
DROP TABLE "AuthorizationTokens";

-- DropEnum
DROP TYPE "AuthorizationPermit";

-- CreateTable
CREATE TABLE "AuthorizationToken" (
    "token" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "relation" "AuthorizationRelation" NOT NULL DEFAULT 'viewers',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthorizationToken_pkey" PRIMARY KEY ("token","projectId")
);
