-- AlterTable
ALTER TABLE "File" ADD COLUMN     "uploaderProjectId" TEXT;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_uploaderProjectId_fkey" FOREIGN KEY ("uploaderProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
