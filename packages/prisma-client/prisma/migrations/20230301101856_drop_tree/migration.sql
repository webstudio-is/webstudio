-- DropForeignKey
ALTER TABLE "Tree" DROP CONSTRAINT "Tree_buildId_projectId_fkey";

-- DropForeignKey
ALTER TABLE "Tree" DROP CONSTRAINT "Tree_projectId_fkey";

-- DropTable
DROP TABLE "Tree";
