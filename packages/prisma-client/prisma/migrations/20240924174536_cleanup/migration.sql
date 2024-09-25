ALTER TABLE "Build" ADD COLUMN "isCleaned" BOOLEAN DEFAULT FALSE;

-- PostgREST will use this function as a computed field
-- See: https://docs.postgrest.org/en/v12/references/api/resource_embedding.html#computed-relationships
CREATE OR REPLACE FUNCTION "latestProjectDomainBuildVirtual"("Project")
RETURNS SETOF "latestBuildVirtual"
ROWS 1 AS $$ -- The function is expected to return 1 row

-- This function selects the latest build for a given project domain where:
-- 1. The "deployment" field is not NULL, ensuring it is a production build.
-- 2. The 'destination' field in the JSONB "deployment" is either NULL (for backward compatibility)
--    or equal to 'saas', indicating a non-static build.
-- 3. The selected "domain" must exist in the "Domain" table (many-to-many relation with "Project" via "ProjectDomain")
--    or it must match the "Project.domain" field directly.
-- 4. If 'projectDomain' exists in the JSONB "deployment", it is used as the "domain".
--    If not, the first element of 'domains' in the JSONB "deployment" array is used as the "domain".
-- The function returns the most recent (by "createdAt") valid build.
SELECT
    b.id AS "buildId",
    b."projectId",
    '' as "domainsVirtualId",
    p.domain AS "domain",
    b."createdAt",
    b."publishStatus"
FROM "Build" b
JOIN "Project" p ON b."projectId" = p.id
LEFT JOIN "ProjectDomain" pd ON pd."projectId" = p.id
WHERE b."projectId" = $1.id
  AND b.deployment IS NOT NULL
  -- 'destination' IS NULL for backward compatibility; 'destination' = 'saas' for non-static builds
  AND ((b.deployment::jsonb ->> 'destination') IS NULL OR (b.deployment::jsonb ->> 'destination') = 'saas')
  AND (
      -- Check if 'projectDomain' matches p.domain
      (b.deployment::jsonb ->> 'projectDomain') = p.domain
      -- Check if 'domains' contains p.domain or d.domain
      OR (b.deployment::jsonb -> 'domains') @> to_jsonb(array[p.domain])
  )
ORDER BY b."createdAt" DESC
LIMIT 1;
$$
STABLE
LANGUAGE sql;

-- Comment on the function to provide additional context
COMMENT ON FUNCTION "latestProjectDomainBuildVirtual"("Project") IS 'This function computes the latest build for a project domain, ensuring it is a production (non-static) build, where the domain matches either the Project.domain field or exists in the related Domain table. It provides backward compatibility for older records with a missing "destination" field.';



CREATE OR REPLACE FUNCTION database_cleanup(
  from_date timestamp DEFAULT '2020-01-01 00:00:00',
  to_date timestamp DEFAULT '2099-12-31 23:59:59' -- SQL should die long before this date!
) RETURNS VOID AS $$
BEGIN
  WITH latest_builds AS (
    SELECT "buildId" FROM "Project" p, LATERAL "latestProjectDomainBuildVirtual"(p)
    UNION
    SELECT "buildId" FROM "Project" p, LATERAL "latestBuildVirtual"(p)
    UNION
    SELECT lb."buildId"
    FROM "Project" p, LATERAL "domainsVirtual"(p) dv, LATERAL "latestBuildVirtual"(dv) lb
  )
  UPDATE "Build"
  SET
    "styleSources" = '[]'::text,
    styles = '[]'::text,
    breakpoints = '[]'::text,
    "styleSourceSelections" = '[]'::text,
    props = '[]'::text,
    instances = '[]'::text,
    "dataSources" = '[]'::text,
    resources = '[]'::text,
    "marketplaceProduct" = '{}'::text,
    "isCleaned" = TRUE
  WHERE deployment IS NOT NULL
  AND id NOT IN (SELECT "buildId" FROM latest_builds)
  AND "isCleaned" = FALSE
  AND "createdAt" BETWEEN from_date AND to_date;  -- Filter by date range (for testing purposes)
END;
$$ LANGUAGE plpgsql;

-- SELECT database_cleanup();
