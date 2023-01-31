-- DropForeignKey
ALTER TABLE "Tree" DROP CONSTRAINT "Tree_buildId_fkey";

-- DropForeignKey
ALTER TABLE "Tree" DROP CONSTRAINT "Tree_projectId_fkey";

-- AlterTable
ALTER TABLE "Tree" ALTER COLUMN "buildId" SET NOT NULL,
ALTER COLUMN "projectId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Tree" ADD CONSTRAINT "Tree_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tree" ADD CONSTRAINT "Tree_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "Build"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
