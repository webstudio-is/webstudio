CREATE OR REPLACE VIEW "AclProjectDirect" AS SELECT DISTINCT ON ("projectId", "userId")
  *
FROM ((
    SELECT
      p.id AS "projectId",
      pup.access,
      pup."userId",
      0 AS specificity
    FROM
      "Project" p,
      "ProjectUserPermission" pup
    WHERE
      p.id = pup."projectId")
  UNION ALL (
    SELECT
      p.id AS "projectId",
      pgp.access,
      ug."userId",
      1 AS specificity
    FROM
      "Project" p,
      "ProjectGroupPermission" pgp,
      "UserGroup" ug
    WHERE
      pgp."projectId" = p.id
      AND pgp."groupId" = ug."groupId")) s
ORDER BY
  "projectId",
  "userId",
  "specificity",
  "access";

CREATE OR REPLACE VIEW "AclWorkspaceDirect" AS SELECT DISTINCT ON ("workspaceId", "userId")
  *
FROM ((
    SELECT
      p.id AS "workspaceId",
      pup.access,
      pup."userId",
      0 AS specificity
    FROM
      "Workspace" p,
      "WorkspaceUserPermission" pup
    WHERE
      p.id = pup."workspaceId")
  UNION ALL (
    SELECT
      p.id AS "workspaceId",
      pgp.access,
      ug."userId",
      1 AS specificity
    FROM
      "Workspace" p,
      "WorkspaceGroupPermission" pgp,
      "UserGroup" ug
    WHERE
      pgp."workspaceId" = p.id
      AND pgp."groupId" = ug."groupId")) s
ORDER BY
  "workspaceId",
  "userId",
  "specificity",
  "access";

CREATE OR REPLACE VIEW "AclProject" AS SELECT DISTINCT ON ("projectId", "userId")
  "projectId",
  "userId",
  "access"
FROM ((
    SELECT
      p.id AS "projectId",
      awd.access,
      awd."userId",
      1 AS depth
    FROM
      "Project" p,
      "AclWorkspaceDirect" awd
    WHERE
      p."workspaceId" = awd."workspaceId")
  UNION ALL (
    SELECT
      "projectId",
      "access",
      "userId",
      0 AS depth
    FROM
      "AclProjectDirect")) s
ORDER BY
  "projectId",
  "userId",
  depth,
  access;
