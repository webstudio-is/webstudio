-- This is an empty migration.
DROP TABLE IF EXISTS "latestBuildVirtual" CASCADE;

-- In the postgrest-js type system, it appears that Project has a 1-1 relationship with latestBuild
CREATE TABLE "latestBuildVirtual" (
    "buildId" text REFERENCES "Build" (id) unique NOT NULL,
    "projectId" text PRIMARY KEY REFERENCES "Project" (id) NOT NULL, -- PRIMARY KEY indicates a 1-1 relationship https://docs.postgrest.org/en/v12/references/api/resource_embedding.html#one-to-one-relationships
    domain text NOT NULL,
    "createdAt" timestamp(3) with time zone NOT NULL,
    "publishStatus" "PublishStatus" NOT NULL
);

-- Adding comments for the table and specific column
COMMENT ON TABLE "latestBuildVirtual" IS 'Virtual table representing the latest build for each project, enforcing a 1-1 relationship with the Project table. Used ONLY for postgrest types';

COMMENT ON COLUMN "latestBuildVirtual"."projectId" IS 'Identifier for the project, enforcing a 1-1 relationship with the Project table as a primary key';


-- PostgREST will use this function as a computed field
-- See: https://docs.postgrest.org/en/v12/references/api/resource_embedding.html#computed-relationships
CREATE OR REPLACE FUNCTION "latestBuildVirtual"("Project")
RETURNS SETOF "latestBuildVirtual"
ROWS 1 AS $$ -- The function is expected to return 1 row

-- This function selects the latest build for a given project where:
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
    -- 'projectDomain' for backward compatibility; use the first element of 'domains' if 'projectDomain' is NULL
    COALESCE((b.deployment::jsonb ->> 'projectDomain'), (b.deployment::jsonb -> 'domains') ->> '0') AS "domain",
    b."createdAt",
    b."publishStatus"
FROM "Build" b
JOIN "Project" p ON b."projectId" = p.id
LEFT JOIN "ProjectDomain" pd ON pd."projectId" = p.id
LEFT JOIN "Domain" d ON d.id = pd."domainId"
WHERE b."projectId" = $1.id
  AND b.deployment IS NOT NULL
  -- 'destination' IS NULL for backward compatibility; 'destination' = 'saas' for non-static builds
  AND ((b.deployment::jsonb ->> 'destination') IS NULL OR (b.deployment::jsonb ->> 'destination') = 'saas')
  AND (
      COALESCE((b.deployment::jsonb ->> 'projectDomain'), (b.deployment::jsonb -> 'domains') ->> '0') = p.domain
      OR COALESCE((b.deployment::jsonb ->> 'projectDomain'), (b.deployment::jsonb -> 'domains') ->> '0') = d.domain
  )
ORDER BY b."createdAt" DESC
LIMIT 1;

$$
STABLE
LANGUAGE sql;

-- Comment on the function to provide additional context
COMMENT ON FUNCTION "latestBuildVirtual"("Project") IS 'This function computes the latest build for a project, ensuring it is a production (non-static) build, where the domain matches either the Project.domain field or exists in the related Domain table. It provides backward compatibility for older records with a missing "destination" field.';

-- Example:
-- select p.id, p.domain, lbv.* from "Project" p
-- LEFT JOIN LATERAL (
--    SELECT * FROM "latestBuildVirtual"(p)
-- ) lbv ON TRUE;

DROP VIEW IF EXISTS "LatestBuildPerProject" CASCADE;
