-- Soft-delete for workspaces: add isDeleted column, mirror the Project pattern.
-- Marking the workspace deleted first (single row update) makes the multi-step
-- "delete workspace + delete its projects" sequence safe against partial failure.

ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- Update WorkspaceProjectAuthorization to exclude soft-deleted workspaces
CREATE OR REPLACE VIEW "WorkspaceProjectAuthorization" AS
SELECT
  w."userId",
  p.id AS "projectId",
  'own' AS "relation"
FROM "Workspace" w
JOIN "Project" p ON p."workspaceId" = w.id
WHERE w."isDeleted" = false
  AND p."isDeleted" = false
UNION ALL
SELECT
  wm."userId",
  p.id AS "projectId",
  wm.relation::text AS "relation"
FROM "WorkspaceMember" wm
JOIN "Workspace" w ON w.id = wm."workspaceId"
JOIN "Project" p ON p."workspaceId" = wm."workspaceId"
WHERE wm."removedAt" IS NULL
  AND w."isDeleted" = false
  AND p."isDeleted" = false;
