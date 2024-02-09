CREATE OR REPLACE VIEW "ProjectWithDomain" AS
SELECT
  pd."projectId",
  pd."domainId",
  pd."txtRecord",
  pd."cname",
  pd."createdAt",
  -- any DNS txt record change would cause verified to be changed immediately
  coalesce(pd."txtRecord" = d."txtRecord", false) AS verified,
  -- domains count per user
  p."userId"
FROM
  "ProjectDomain" pd
  LEFT JOIN "Domain" d ON pd."domainId" = d.id
  LEFT JOIN "Project" p ON pd."projectId" = p.id
  WHERE p."isDeleted" = FALSE;

