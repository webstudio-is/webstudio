-- DropForeignKey
ALTER TABLE "Group" DROP CONSTRAINT "Group_createdById_fkey";

-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "workspaceId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "Workspace" DROP COLUMN "workspaceId";

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_workspaceId_createdById_fkey" FOREIGN KEY ("workspaceId", "createdById") REFERENCES "Workspace"("id", "createdById") ON DELETE RESTRICT ON UPDATE CASCADE;
