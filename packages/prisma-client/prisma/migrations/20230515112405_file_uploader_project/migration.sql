-- DropForeignKey
ALTER TABLE "File" DROP CONSTRAINT "File_userId_fkey";

-- AlterTable
ALTER TABLE "File" DROP COLUMN "userId",
ADD COLUMN     "uploaderProjectId" TEXT;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_uploaderProjectId_fkey" FOREIGN KEY ("uploaderProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
