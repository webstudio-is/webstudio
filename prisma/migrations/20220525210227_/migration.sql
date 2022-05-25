-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "prodTreeId" TEXT,
    "devTreeId" TEXT NOT NULL,
    "prodTreeIdHistory" TEXT NOT NULL DEFAULT '[]'
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY
);

-- CreateTable
CREATE TABLE "Tree" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "root" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "InstanceProps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "instanceId" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "props" TEXT NOT NULL DEFAULT '[]'
);

-- CreateTable
CREATE TABLE "Breakpoints" (
    "treeId" TEXT NOT NULL PRIMARY KEY,
    "values" TEXT NOT NULL DEFAULT '[]'
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_domain_key" ON "Project"("domain");
