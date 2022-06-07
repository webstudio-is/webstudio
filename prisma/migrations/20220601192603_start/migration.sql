-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "prodTreeId" TEXT,
    "devTreeId" TEXT NOT NULL,
    "prodTreeIdHistory" TEXT NOT NULL DEFAULT E'[]',

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tree" (
    "id" TEXT NOT NULL,
    "root" TEXT NOT NULL,

    CONSTRAINT "Tree_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstanceProps" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "props" TEXT NOT NULL DEFAULT E'[]',

    CONSTRAINT "InstanceProps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Breakpoints" (
    "treeId" TEXT NOT NULL,
    "values" TEXT NOT NULL DEFAULT E'[]',

    CONSTRAINT "Breakpoints_pkey" PRIMARY KEY ("treeId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_domain_key" ON "Project"("domain");
