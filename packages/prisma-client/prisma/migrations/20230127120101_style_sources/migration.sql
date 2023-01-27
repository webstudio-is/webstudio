-- AlterTable
ALTER TABLE "Build"
  ADD COLUMN "styleSources" TEXT NOT NULL DEFAULT '[]',
  ADD COLUMN "styles" TEXT NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "Tree"
  ADD COLUMN "styleSelections" TEXT NOT NULL DEFAULT '[]';
