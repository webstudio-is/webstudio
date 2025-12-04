-- Add updatedAt field to latestBuildVirtual virtual table (type definition)
-- and update both functions to include Build's updatedAt timestamp

-- First, drop existing functions that depend on the old table structure
DROP FUNCTION IF EXISTS "latestBuildVirtual"("Project");
DROP FUNCTION IF EXISTS "latestBuildVirtual"("domainsVirtual");
DROP FUNCTION IF EXISTS "latestProjectDomainBuildVirtual"("Project");
DROP FUNCTION IF EXISTS "latestBuildVirtual"("DashboardProject");

-- Add updatedAt column to the virtual table type definition
ALTER TABLE "latestBuildVirtual"
  ADD COLUMN "updatedAt" timestamp(3) with time zone NOT NULL DEFAULT NOW();

COMMENT ON COLUMN "public"."latestBuildVirtual"."updatedAt" IS 'Timestamp indicating when the Build was last updated';

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
    OR (b.deployment :: jsonb -> 'domains') @> to_jsonb(array [p.domain]) THEN p.domain
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
  b."projectId" = $1.id
  AND b.deployment IS NOT NULL -- 'destination' IS NULL for backward compatibility; 'destination' = 'saas' for non-static builds
  AND (
    (b.deployment :: jsonb ->> 'destination') IS NULL
    OR (b.deployment :: jsonb ->> 'destination') = 'saas'
  )
  AND (
    -- Check if 'projectDomain' matches p.domain
    (b.deployment :: jsonb ->> 'projectDomain') = p.domain -- Check if 'domains' contains p.domain or d.domain
    OR (b.deployment :: jsonb -> 'domains') @> to_jsonb(array [p.domain])
    OR (b.deployment :: jsonb -> 'domains') @> to_jsonb(array [d.domain])
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
  JOIN "Domain" d ON d.id = $1."domainId"
WHERE
  b."projectId" = $1."projectId"
  AND b.deployment IS NOT NULL
  AND (b.deployment :: jsonb -> 'domains') @> to_jsonb(array [d.domain])
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
  b."projectId" = $1.id
  AND b.deployment IS NOT NULL
  AND (
    (b.deployment :: jsonb ->> 'destination') IS NULL
    OR (b.deployment :: jsonb ->> 'destination') = 'saas'
  )
  AND (
    (b.deployment :: jsonb ->> 'projectDomain') = p.domain
    OR (b.deployment :: jsonb -> 'domains') @> to_jsonb(array [p.domain])
  )
ORDER BY
  b."createdAt" DESC
LIMIT
  1;

$$ STABLE LANGUAGE sql;

COMMENT ON FUNCTION "latestProjectDomainBuildVirtual"("Project") IS 'This function computes the latest build for a project domain, ensuring it is a production (non-static) build, where the domain matches either the Project.domain field or exists in the related Domain table. It provides backward compatibility for older records with a missing "destination" field.';

-- Add latestBuildVirtual function overload for DashboardProject view
-- This is needed because PostgREST computed fields require a function
-- that matches the source table/view type. DashboardProject is a view
-- over Project, so we need this wrapper function that casts to Project type.
CREATE
OR REPLACE FUNCTION "latestBuildVirtual"("DashboardProject") RETURNS SETOF "latestBuildVirtual" ROWS 1 AS $$
SELECT
  *
FROM
  "latestBuildVirtual"(ROW($1.id, $1.title, $1.domain, $1."userId", $1."isDeleted", $1."createdAt", $1."previewImageAssetId", $1."marketplaceApprovalStatus", $1.tags)::"Project");

$$ STABLE LANGUAGE sql;

COMMENT ON FUNCTION "latestBuildVirtual"("DashboardProject") IS 'Wrapper function to make latestBuildVirtual work with DashboardProject view for PostgREST computed fields.';

-- Grant execute permissions to all PostgREST roles
-- Uses DO block to check if roles exist before granting (prevents errors if roles are missing)
DO $$
DECLARE
  role_name TEXT;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated', 'service_role']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION "latestBuildVirtual"("DashboardProject") TO %I', role_name);
    END IF;
  END LOOP;
END $$;