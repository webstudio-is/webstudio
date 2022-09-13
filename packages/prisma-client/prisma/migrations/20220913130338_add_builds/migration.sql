-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "devBuildId" TEXT;

-- CreateTable
CREATE TABLE "Build" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pages" TEXT NOT NULL,
    "projectId" TEXT,
    "isCurrentProd" BOOLEAN NOT NULL,

    CONSTRAINT "Build_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_devBuildId_fkey" FOREIGN KEY ("devBuildId") REFERENCES "Build"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Build" ADD CONSTRAINT "Build_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
