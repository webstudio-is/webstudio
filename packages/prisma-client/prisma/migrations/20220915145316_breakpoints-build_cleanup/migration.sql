-- AlterTable
ALTER TABLE "Breakpoints" DROP CONSTRAINT "Breakpoints_pkey",
DROP COLUMN "treeId",
ALTER COLUMN "buildId" SET NOT NULL,
ADD CONSTRAINT "Breakpoints_pkey" PRIMARY KEY ("buildId");

-- AddForeignKey
ALTER TABLE "Breakpoints" ADD CONSTRAINT "Breakpoints_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "Build"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
