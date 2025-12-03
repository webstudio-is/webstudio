-- Add updatedAt field to latestBuildVirtual virtual table (type definition)
-- and update both functions to include Build's updatedAt timestamp
-- Add updatedAt column to the virtual table type definition
ALTER TABLE
  "latestBuildVirtual"
ADD
  COLUMN "updatedAt" timestamp(3) with time zone NOT NULL;

COMMENT ON COLUMN "latestBuildVirtual"."updatedAt" IS 'Timestamp indicating when the Build was last updated';

-- Recreate the function for Project with updatedAt field
CREATE
OR REPLACE FUNCTION "latestBuildVirtual"("Project") RETURNS SETOF "latestBuildVirtual" ROWS 1 AS $$
SELECT
  b.id AS "buildId",
  b."projectId",
  '' as "domainsVirtualId",
  -- Use CASE to determine which domain to select based on conditions
  CASE
    WHEN (b.deployment :: jsonb ->> 'projectDomain') = p.domain
    OR (b.deployment :: jsonb -> 'domains') @ > to_jsonb(array [p.domain]) THEN p.domain
    ELSE d.domain
  END AS "domain",
  b."createdAt",
  b."publishStatus",
  b."updatedAt"
FROM
  "Build" b
  JOIN "Project" p ON b."projectId" = p.id
  LEFT JOIN "ProjectDomain" pd ON pd."projectId" = p.id
  LEFT JOIN "Domain" d ON d.id = pd."domainId"
WHERE
  b."projectId" = $ 1.id
  AND b.deployment IS NOT NULL -- 'destination' IS NULL for backward compatibility; 'destination' = 'saas' for non-static builds
  AND (
    (b.deployment :: jsonb ->> 'destination') IS NULL
    OR (b.deployment :: jsonb ->> 'destination') = 'saas'
  )
  AND (
    -- Check if 'projectDomain' matches p.domain
    (b.deployment :: jsonb ->> 'projectDomain') = p.domain -- Check if 'domains' contains p.domain or d.domain
    OR (b.deployment :: jsonb -> 'domains') @ > to_jsonb(array [p.domain])
    OR (b.deployment :: jsonb -> 'domains') @ > to_jsonb(array [d.domain])
  )
ORDER BY
  b."createdAt" DESC
LIMIT
  1;

$$ STABLE LANGUAGE sql;

-- Comment on the function
COMMENT ON FUNCTION "latestBuildVirtual"("Project") IS 'This function computes the latest build for a project, ensuring it is a production (non-static) build, where the domain matches either the Project.domain field or exists in the related Domain table. It provides backward compatibility for older records with a missing "destination" field.';

-- Recreate the function for domainsVirtual with updatedAt field
CREATE
OR REPLACE FUNCTION "latestBuildVirtual"("domainsVirtual") RETURNS SETOF "latestBuildVirtual" ROWS 1 AS $$
SELECT
  b.id AS "buildId",
  b."projectId",
  '' as "domainsVirtualId",
  d."domain",
  b."createdAt",
  b."publishStatus",
  b."updatedAt"
FROM
  "Build" b
  JOIN "Domain" d ON d.id = $ 1."domainId"
WHERE
  b."projectId" = $ 1."projectId"
  AND b.deployment IS NOT NULL
  AND (b.deployment :: jsonb -> 'domains') @ > to_jsonb(array [d.domain])
ORDER BY
  b."createdAt" DESC
LIMIT
  1;

$$ STABLE LANGUAGE sql;

-- Adding a comment to provide more context
COMMENT ON FUNCTION "latestBuildVirtual"("domainsVirtual") IS 'Returns the latest build for a given project and domain as a computed field for PostgREST.';

-- Update latestProjectDomainBuildVirtual function to include updatedAt
CREATE
OR REPLACE FUNCTION "latestProjectDomainBuildVirtual"("Project") RETURNS SETOF "latestBuildVirtual" ROWS 1 AS $$
SELECT
  b.id AS "buildId",
  b."projectId",
  '' as "domainsVirtualId",
  p.domain AS "domain",
  b."createdAt",
  b."publishStatus",
  b."updatedAt"
FROM
  "Build" b
  JOIN "Project" p ON b."projectId" = p.id
  LEFT JOIN "ProjectDomain" pd ON pd."projectId" = p.id
WHERE
  b."projectId" = $ 1.id
  AND b.deployment IS NOT NULL
  AND (
    (b.deployment :: jsonb ->> 'destination') IS NULL
    OR (b.deployment :: jsonb ->> 'destination') = 'saas'
  )
  AND (
    (b.deployment :: jsonb ->> 'projectDomain') = p.domain
    OR (b.deployment :: jsonb -> 'domains') @ > to_jsonb(array [p.domain])
  )
ORDER BY
  b."createdAt" DESC
LIMIT
  1;

$$ STABLE LANGUAGE sql;

COMMENT ON FUNCTION "latestProjectDomainBuildVirtual"("Project") IS 'This function computes the latest build for a project domain, ensuring it is a production (non-static) build, where the domain matches either the Project.domain field or exists in the related Domain table. It provides backward compatibility for older records with a missing "destination" field.';