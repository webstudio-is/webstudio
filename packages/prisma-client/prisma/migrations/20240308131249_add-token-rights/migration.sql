-- AlterTable
ALTER TABLE "AuthorizationToken" ADD COLUMN     "canClone" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "canCopy" BOOLEAN NOT NULL DEFAULT true;
