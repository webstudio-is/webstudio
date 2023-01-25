-- AlterTable
ALTER TABLE "Tree" ADD COLUMN     "styleRefs" TEXT NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "StyleSources" (
    "buildIda" TEXT NOT NULL,
    "styleSources" TEXT NOT NULL DEFAULT '[]',
    "styles" TEXT NOT NULL DEFAULT '[]',

    CONSTRAINT "StyleSources_pkey" PRIMARY KEY ("buildIda")
);
