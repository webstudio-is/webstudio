-- AlterTable
ALTER TABLE
  "Project"
ADD
  COLUMN "isClonable" BOOLEAN DEFAULT false,
ADD
  COLUMN "isPublic" BOOLEAN DEFAULT false;