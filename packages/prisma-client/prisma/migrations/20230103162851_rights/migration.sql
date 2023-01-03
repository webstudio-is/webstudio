-- CreateEnum
CREATE TYPE "Access" AS ENUM ('WRITE', 'READ', 'COMMENT');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "workspaceId" UUID;

-- CreateTable
CREATE TABLE "Workspace" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "workspaceId" UUID NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserGroup" (
    "userId" TEXT NOT NULL,
    "groupId" UUID NOT NULL,

    CONSTRAINT "UserGroup_pkey" PRIMARY KEY ("userId","groupId")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceGroupPermission" (
    "access" "Access" NOT NULL,
    "workspaceId" UUID NOT NULL,
    "groupId" UUID NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "WorkspaceGroupPermission_pkey" PRIMARY KEY ("workspaceId","groupId")
);

-- CreateTable
CREATE TABLE "ProjectGroupPermission" (
    "access" "Access" NOT NULL,
    "projectId" TEXT NOT NULL,
    "groupId" UUID NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "ProjectGroupPermission_pkey" PRIMARY KEY ("projectId","groupId")
);

-- CreateTable
CREATE TABLE "WorkspaceUserPermission" (
    "access" "Access" NOT NULL,
    "workspaceId" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "WorkspaceUserPermission_pkey" PRIMARY KEY ("workspaceId","userId")
);

-- CreateTable
CREATE TABLE "ProjectUserPermission" (
    "access" "Access" NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "ProjectUserPermission_pkey" PRIMARY KEY ("projectId","userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_id_createdById_key" ON "Workspace"("id", "createdById");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_workspaceId_createdById_fkey" FOREIGN KEY ("workspaceId", "createdById") REFERENCES "Workspace"("id", "createdById") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGroup" ADD CONSTRAINT "UserGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGroup" ADD CONSTRAINT "UserGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceGroupPermission" ADD CONSTRAINT "WorkspaceGroupPermission_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceGroupPermission" ADD CONSTRAINT "WorkspaceGroupPermission_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceGroupPermission" ADD CONSTRAINT "WorkspaceGroupPermission_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectGroupPermission" ADD CONSTRAINT "ProjectGroupPermission_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectGroupPermission" ADD CONSTRAINT "ProjectGroupPermission_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectGroupPermission" ADD CONSTRAINT "ProjectGroupPermission_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceUserPermission" ADD CONSTRAINT "WorkspaceUserPermission_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceUserPermission" ADD CONSTRAINT "WorkspaceUserPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceUserPermission" ADD CONSTRAINT "WorkspaceUserPermission_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectUserPermission" ADD CONSTRAINT "ProjectUserPermission_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectUserPermission" ADD CONSTRAINT "ProjectUserPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectUserPermission" ADD CONSTRAINT "ProjectUserPermission_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
