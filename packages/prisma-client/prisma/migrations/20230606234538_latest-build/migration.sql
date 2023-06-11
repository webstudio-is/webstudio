-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('PENDING', 'PUBLISHED', 'FAILED');

-- AlterTable
ALTER TABLE "Build" ADD COLUMN     "publishStatus" "PublishStatus" NOT NULL DEFAULT 'PENDING';

-- Update existing and published
UPDATE "Build" SET "publishStatus" = 'PUBLISHED' WHERE deployment IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Project_id_domain_key" ON "Project"("id", "domain");


CREATE OR REPLACE VIEW "LatestBuildPerProjectDomain" AS
WITH lbd AS (
  SELECT DISTINCT ON ("projectId",
    "domain")
    jsonb_array_elements_text(deployment::jsonb -> 'domains') AS "domain",
    bld.id AS "buildId",
    bld."projectId",
    bld."updatedAt",
    bld."publishStatus"
  FROM
    "Build" bld
  WHERE
    bld.deployment IS NOT NULL
  ORDER BY
    bld."projectId",
    "domain",
    bld."createdAt" DESC,
    "buildId"
),
lb AS (
  SELECT DISTINCT ON ("projectId")
    bld.id AS "buildId",
    bld."projectId",
    bld."updatedAt",
    bld."publishStatus"
  FROM
    "Build" bld
  WHERE
    bld.deployment IS NOT NULL
  ORDER BY
    bld."projectId",
    bld."createdAt" DESC,
    "buildId"
)
SELECT
  d.id AS "domainId",
  lbd."projectId",
  lbd."buildId",
  coalesce(lbd."updatedAt" = lb."updatedAt", FALSE) AS "isLatestBuild",
  lbd."publishStatus",
  lbd."updatedAt"
FROM
  lbd,
  lb,
  "Domain" d
WHERE
  lbd.domain = d.domain
  AND lb."projectId" = lbd."projectId";

CREATE OR REPLACE VIEW "LatestBuildPerProject" AS
WITH lb AS (
  SELECT DISTINCT ON ("projectId")
    bld.id AS "buildId",
    bld."projectId",
    bld."updatedAt"
  FROM
    "Build" bld
  WHERE
    bld.deployment IS NOT NULL
  ORDER BY
    bld."projectId",
    bld."createdAt" DESC,
    "buildId"
)
SELECT DISTINCT ON ("projectId", "domain")
  bld.id AS "buildId",
  bld."projectId",
  deployment::jsonb ->> 'projectDomain' AS domain,
  coalesce(bld."updatedAt" = lb."updatedAt", FALSE) AS "isLatestBuild",
  bld."updatedAt",
  bld."publishStatus"
FROM
  "Build" bld,
  lb
WHERE
  bld.deployment IS NOT NULL
  AND lb."projectId" = bld."projectId"
ORDER BY
  bld."projectId",
  "domain",
  bld."createdAt" DESC,
  "buildId";
