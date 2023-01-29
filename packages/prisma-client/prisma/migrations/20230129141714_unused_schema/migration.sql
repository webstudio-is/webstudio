-- DropForeignKey
ALTER TABLE "DesignTokens" DROP CONSTRAINT "DesignTokens_buildId_fkey";

-- AlterTable
ALTER TABLE "Tree" DROP COLUMN "presetStyles";

-- DropTable
DROP TABLE "DesignTokens";

-- DropTable
DROP TABLE "InstanceProps";
