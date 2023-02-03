-- DropForeignKey
ALTER TABLE "Tree" DROP CONSTRAINT "Tree_buildId_fkey";

-- AlterTable
ALTER TABLE "Asset" DROP CONSTRAINT "Asset_pkey",
ADD CONSTRAINT "Asset_pkey" PRIMARY KEY ("id", "projectId");

-- AlterTable
ALTER TABLE "Build" DROP CONSTRAINT "Build_pkey",
ADD CONSTRAINT "Build_pkey" PRIMARY KEY ("id", "projectId");

-- AlterTable
ALTER TABLE "Tree" DROP CONSTRAINT "Tree_pkey",
ADD CONSTRAINT "Tree_pkey" PRIMARY KEY ("id", "projectId");

-- AddForeignKey
ALTER TABLE "Tree" ADD CONSTRAINT "Tree_buildId_projectId_fkey" FOREIGN KEY ("buildId", "projectId") REFERENCES "Build"("id", "projectId") ON DELETE RESTRICT ON UPDATE CASCADE;
