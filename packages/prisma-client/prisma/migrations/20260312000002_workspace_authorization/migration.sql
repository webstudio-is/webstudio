-- View: workspace-based project authorization
-- Workspace owner gets "own" on every project in their workspace
-- Workspace members get their stored relation (e.g. "administrators")
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
JOIN "Project" p ON p."workspaceId" = wm."workspaceId";
