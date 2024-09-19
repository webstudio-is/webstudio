-- Drop the "domainsVirtual" table if it already exists, cascading to any dependent objects.
DROP TABLE IF EXISTS "domainsVirtual" CASCADE;

-- Create the "domainsVirtual" table to represent a virtual view of the relationship between domains and projects.
-- This table enforces a 1-1 relationship between Project and Domain, used primarily for postgrest types and API purposes.
CREATE TABLE "domainsVirtual" (
    "id" text PRIMARY KEY NOT NULL, -- Primary key for the virtual table.
    "domainId" text REFERENCES "Domain" (id) NOT NULL, -- Foreign key referencing the Domain table's ID.
    "projectId" text REFERENCES "Project" (id) NOT NULL, -- Foreign key referencing the Project table's ID.
    "domain" text NOT NULL, -- Domain name (must not be null).
    "status" "DomainStatus" NOT NULL DEFAULT 'INITIALIZING'::"DomainStatus", -- Status of the domain, defaulting to 'INITIALIZING'.
    "error" text, -- Optional error message, populated if status is 'ERROR'.
    "domainTxtRecord" text, -- Current TXT record for the domain, retrieved from the Domain table.
    "expectedTxtRecord" text NOT NULL, -- Expected TXT record, coming from the ProjectDomain table.
    "cname" text NOT NULL, -- CNAME record for the domain, coming from the ProjectDomain table.
    "verified" boolean NOT NULL DEFAULT false, -- Boolean flag indicating if the domain is verified (if TXT records match).
    "createdAt" timestamp(3) with time zone NOT NULL, -- Creation timestamp from ProjectDomain.
    "updatedAt" timestamp(3) with time zone NOT NULL -- Last update timestamp from Domain.
);

-- Add detailed comments for the table and each relevant column.
COMMENT ON TABLE "domainsVirtual" IS 'Virtual table representing domains related to each project. This table enforces a 1-1 relationship with the Project table and is used for API interaction (postgrest types).';

COMMENT ON COLUMN "domainsVirtual"."domainId" IS 'Unique identifier for the domain (Domain table reference).';
COMMENT ON COLUMN "domainsVirtual"."projectId" IS 'Unique identifier for the project, acting as the primary key (1-1 relationship with Project table).';
COMMENT ON COLUMN "domainsVirtual"."domain" IS 'The domain name (must not be NULL).';
COMMENT ON COLUMN "domainsVirtual"."status" IS 'Current status of the domain, with a default of INITIALIZING.';
COMMENT ON COLUMN "domainsVirtual"."error" IS 'Optional error message field populated if the domain status is ERROR.';
COMMENT ON COLUMN "domainsVirtual"."domainTxtRecord" IS 'Current TXT record for the domain, coming from the Domain table.';
COMMENT ON COLUMN "domainsVirtual"."expectedTxtRecord" IS 'Expected TXT record for the domain, pulled from the ProjectDomain table.';
COMMENT ON COLUMN "domainsVirtual"."verified" IS 'Boolean flag indicating whether the domain is verified (true if TXT records match, false otherwise).';
COMMENT ON COLUMN "domainsVirtual"."createdAt" IS 'Timestamp indicating when the ProjectDomain entry was created.';
COMMENT ON COLUMN "domainsVirtual"."updatedAt" IS 'Timestamp indicating when the Domain was last updated.';

-- Create the "domainsVirtual" function to return all domain-related data for a specific project.
CREATE OR REPLACE FUNCTION "domainsVirtual"("Project")
RETURNS SETOF "domainsVirtual" AS $$
    -- This function retrieves all the domain information associated with a specific project by joining the Domain and ProjectDomain tables.
    -- It returns a result set conforming to the "domainsVirtual" structure, including fields such as domain status, error, verification status, etc.
    SELECT
        "Domain".id || '-' || "ProjectDomain"."projectId" as id,
        "Domain".id AS "domainId", -- Domain ID from Domain table
        "ProjectDomain"."projectId", -- Project ID from ProjectDomain table
        "Domain".domain, -- Domain name
        "Domain".status, -- Current domain status
        "Domain".error, -- Error message, if any
        "Domain"."txtRecord" AS "domainTxtRecord", -- Current TXT record from Domain table
        "ProjectDomain"."txtRecord" AS "expectedTxtRecord", -- Expected TXT record from ProjectDomain table
        "ProjectDomain"."cname" AS "cname",
        CASE
            WHEN "Domain"."txtRecord" = "ProjectDomain"."txtRecord" THEN true -- If TXT records match, domain is verified
            ELSE false
        END AS "verified", -- Boolean flag for verification status
        "ProjectDomain"."createdAt", -- Creation timestamp from ProjectDomain table
        "Domain"."updatedAt" -- Last updated timestamp from Domain table
    FROM
        "Domain"
    JOIN
        "ProjectDomain" ON "Domain".id = "ProjectDomain"."domainId" -- Joining Domain and ProjectDomain on domainId
    WHERE
        "ProjectDomain"."projectId" = $1.id; -- Filtering by projectId passed as an argument to the function
$$
STABLE
LANGUAGE sql;

-- Add function-specific comments to explain its behavior.
COMMENT ON FUNCTION "domainsVirtual"("Project") IS 'Function that retrieves domain-related data for a given project by joining the Domain and ProjectDomain tables. It returns a result set that conforms to the structure defined in the domainsVirtual virtual table.';



DROP TABLE IF EXISTS "latestBuildVirtual" CASCADE;

-- In the postgrest-js type system, it appears that Project has a 1-1 relationship with latestBuild
CREATE TABLE "latestBuildVirtual" (
    "buildId" text REFERENCES "Build" (id) unique NOT NULL,
    "projectId" text PRIMARY KEY REFERENCES "Project" (id) NOT NULL, -- PRIMARY KEY indicates a 1-1 relationship https://docs.postgrest.org/en/v12/references/api/resource_embedding.html#one-to-one-relationships
    "domainsVirtualId" text  REFERENCES "domainsVirtual" ("id") unique NOT NULL, -- UNIQUE KEY indicates a 1-1 relationship https://docs.postgrest.org/en/v12/references/api/resource_embedding.html#one-to-one-relationships
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
    '' as "domainsVirtualId",
    -- Use CASE to determine which domain to select based on conditions
    CASE
        WHEN (b.deployment::jsonb ->> 'projectDomain') = p.domain
             OR (b.deployment::jsonb -> 'domains') @> to_jsonb(array[p.domain])
        THEN p.domain
        ELSE d.domain
    END AS "domain",
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
      -- Check if 'projectDomain' matches p.domain
      (b.deployment::jsonb ->> 'projectDomain') = p.domain
      -- Check if 'domains' contains p.domain or d.domain
      OR (b.deployment::jsonb -> 'domains') @> to_jsonb(array[p.domain])
      OR (b.deployment::jsonb -> 'domains') @> to_jsonb(array[d.domain])
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






-- This function defines a computed field "latestBuildVirtual" for PostgREST
-- It returns the latest build associated with a given Project and Domain.
-- Reference: https://docs.postgrest.org/en/v12/references/api/resource_embedding.html#computed-relationships

CREATE OR REPLACE FUNCTION "latestBuildVirtual"("domainsVirtual")
RETURNS SETOF "latestBuildVirtual"
ROWS 1 AS $$  -- The function is expected to return at most 1 row since it fetches the latest build

SELECT
    b.id AS "buildId",         -- ID of the Build
    b."projectId",             -- ID of the Project to which the build belongs
    '' as "domainsVirtualId",  -- Placeholder for the domainsVirtual ID (not used in this context)
    d."domain",                -- Domain associated with the build
    b."createdAt",             -- Timestamp of when the build was created
    b."publishStatus"          -- Status of the build (e.g., published, draft, etc.)
FROM "Build" b
JOIN "Domain" d ON d.id = $1."domainId"  -- Join the "Build" and "Domain" tables using the domain ID
WHERE
    b."projectId" = $1."projectId"  -- Ensure the Build belongs to the specified project
    AND b.deployment IS NOT NULL    -- Ensure the Build has a non-null deployment field
    AND (b.deployment::jsonb -> 'domains') @> to_jsonb(array[d.domain])  -- Check if the domain exists in the deployment JSON array
ORDER BY b."createdAt" DESC  -- Order builds by creation date in descending order to get the latest one
LIMIT 1;  -- Limit the result to the most recent build

$$
STABLE  -- Declares that the function always returns the same result for the same input parameters
LANGUAGE sql;

-- Adding a comment to provide more context about the function's purpose
COMMENT ON FUNCTION "latestBuildVirtual"("domainsVirtual") IS 'Returns the latest build for a given project and domain as a computed field for PostgREST.';



DROP VIEW IF EXISTS "LatestBuildPerProject" CASCADE;
