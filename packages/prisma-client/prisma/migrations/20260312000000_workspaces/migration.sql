-- Stage 2: Workspaces schema
-- Adds Workspace + WorkspaceMember tables, adds workspaceId to Project,
-- drops unused Team model, recreates DashboardProject view with workspaceId.
-- All statements are idempotent — safe to run multiple times.

-- 1. Create Workspace table
CREATE TABLE IF NOT EXISTS "Workspace" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  "userId" TEXT NOT NULL,

  CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Workspace_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Only one default workspace per user
CREATE UNIQUE INDEX IF NOT EXISTS "Workspace_userId_isDefault_key" ON "Workspace"("userId", "isDefault") WHERE "isDefault" = true;

-- 2. Create WorkspaceMember table
CREATE TABLE IF NOT EXISTS "WorkspaceMember" (
  "workspaceId" UUID NOT NULL,
  "userId" TEXT NOT NULL,
  "relation" "AuthorizationRelation" NOT NULL DEFAULT 'administrators',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),

  CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("workspaceId", "userId"),
  CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 3. Add workspaceId to Project (skip if column already exists)
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "workspaceId" UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Project_workspaceId_fkey'
  ) THEN
    ALTER TABLE "Project" ADD CONSTRAINT "Project_workspaceId_fkey"
      FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 4. Drop unused Team model
ALTER TABLE "User" DROP COLUMN IF EXISTS "teamId";
DROP TABLE IF EXISTS "Team";

-- 5. Recreate DashboardProject view with workspaceId
-- First drop the wrapper function that depends on the view
DROP FUNCTION IF EXISTS "latestBuildVirtual"("DashboardProject");

DROP VIEW IF EXISTS "DashboardProject";

CREATE VIEW "DashboardProject" AS
SELECT
  id,
  title,
  tags,
  domain,
  "userId",
  "workspaceId",
  "isDeleted",
  "createdAt",
  "previewImageAssetId",
  "marketplaceApprovalStatus",
  (
    EXISTS (
      SELECT
        1
      FROM
        "Build"
      WHERE
        "Build"."projectId" = "Project".id
        AND "Build".deployment IS NOT NULL
    )
  ) AS "isPublished"
FROM
  "Project";

-- Recreate the latestBuildVirtual wrapper function for DashboardProject
-- Uses a subquery to construct the Project row instead of a fragile ROW() cast
CREATE
OR REPLACE FUNCTION "latestBuildVirtual"("DashboardProject") RETURNS SETOF "latestBuildVirtual" ROWS 1 AS $$
SELECT
  lbv.*
FROM
  "Project" p,
  LATERAL "latestBuildVirtual"(p) lbv
WHERE
  p.id = $1.id
LIMIT 1;

$$ STABLE LANGUAGE sql;

COMMENT ON FUNCTION "latestBuildVirtual"("DashboardProject") IS 'Wrapper function to make latestBuildVirtual work with DashboardProject view for PostgREST computed fields.';

-- Grant execute permissions to PostgREST roles
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
