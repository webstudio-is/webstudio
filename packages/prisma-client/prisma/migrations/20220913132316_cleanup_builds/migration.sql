-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_devBuildId_fkey";

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "devTreeId",
DROP COLUMN "prodTreeId",
DROP COLUMN "prodTreeIdHistory",
ALTER COLUMN "devBuildId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_devBuildId_fkey" FOREIGN KEY ("devBuildId") REFERENCES "Build"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
