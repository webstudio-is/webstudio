DROP VIEW "LatestStaticBuildPerProject";
DROP VIEW "LatestBuildPerProject";

DROP VIEW "LatestBuildPerProjectDomain";

-- AlterTable
ALTER TABLE "Build" ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3);

CREATE OR REPLACE VIEW "LatestStaticBuildPerProject" AS
SELECT DISTINCT ON ("projectId")
  bld.id AS "buildId",
  bld."projectId",
  bld."updatedAt",
  bld."publishStatus"
FROM
  "Build" bld
WHERE
  bld.deployment IS NOT NULL
  AND bld.deployment::jsonb ->> 'destination'::text = 'static'
ORDER BY
  bld."projectId",
  bld."createdAt" DESC,
  "buildId";

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
    AND bld.deployment::jsonb ->> 'projectDomain'::text IS NOT NULL
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
  AND bld.deployment::jsonb ->> 'projectDomain'::text IS NOT NULL
ORDER BY
  bld."projectId",
  "domain",
  bld."createdAt" DESC,
  "buildId";


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
    AND bld.deployment::jsonb ->> 'projectDomain'::text IS NOT NULL
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