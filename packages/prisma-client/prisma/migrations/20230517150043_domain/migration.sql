-- CreateEnum
CREATE TYPE "DomainStatus" AS ENUM ('INITIALIZING', 'ACTIVE', 'ERROR', 'PENDING');

-- CreateTable
CREATE TABLE "Domain" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "txtRecord" TEXT,
    "status" "DomainStatus" NOT NULL DEFAULT 'INITIALIZING',
    "error" TEXT,

    CONSTRAINT "Domain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectDomain" (
    "projectId" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "txtRecord" TEXT NOT NULL,
    "cname" TEXT NOT NULL,

    CONSTRAINT "ProjectDomain_pkey" PRIMARY KEY ("projectId","domainId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Domain_domain_key" ON "Domain"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectDomain_txtRecord_key" ON "ProjectDomain"("txtRecord");

-- CreateIndex
CREATE INDEX "ProjectDomain_domainId_idx" ON "ProjectDomain"("domainId");

-- AddForeignKey
ALTER TABLE "ProjectDomain" ADD CONSTRAINT "ProjectDomain_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDomain" ADD CONSTRAINT "ProjectDomain_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- CreateView
CREATE VIEW "ProjectWithDomain" AS
SELECT
  pd."projectId",
  pd."domainId",
  pd."txtRecord",
  pd."cname",
  pd."createdAt",
  -- any DNS txt record change would cause verified to be changed immediately
  coalesce(pd."txtRecord" = d."txtRecord", false) AS verified,
  -- domains count per user
  p."userId"
FROM
  "ProjectDomain" pd
  LEFT JOIN "Domain" d ON pd."domainId" = d.id
  LEFT JOIN "Project" p ON pd."projectId" = p.id;

