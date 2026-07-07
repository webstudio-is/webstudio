-- Add removedAt column to WorkspaceMember for soft-delete tracking
ALTER TABLE "WorkspaceMember" ADD COLUMN IF NOT EXISTS "removedAt" TIMESTAMPTZ(3);

-- Update the authorization view to exclude removed members
CREATE OR REPLACE VIEW "WorkspaceProjectAuthorization" AS
SELECT
  w."userId",
  p.id AS "projectId",
  'own' AS "relation"
FROM "Workspace" w
JOIN "Project" p ON p."workspaceId" = w.id
UNION ALL
SELECT
  wm."userId",
  p.id AS "projectId",
  wm.relation::text AS "relation"
FROM "WorkspaceMember" wm
JOIN "Project" p ON p."workspaceId" = wm."workspaceId"
WHERE wm."removedAt" IS NULL;
