-- This is an empty migration.
DROP VIEW "ApprovedMarketplaceProduct";

CREATE VIEW "ApprovedMarketplaceProduct" AS
SELECT DISTINCT ON (build."projectId")
  build."projectId",
  build."marketplaceProduct",
  (
    SELECT
      token
    FROM
      "AuthorizationToken" auth
    WHERE
      auth."projectId" = build."projectId" AND
      auth.relation = 'viewers'
    ORDER BY
      auth."token"
    LIMIT 1
  ) AS "authorizationToken"
FROM
  "Build" build
WHERE
  build.deployment IS NOT NULL -- published
  AND build."projectId" IN (
    SELECT
      "id"
    FROM
      "Project"
    WHERE ("isDeleted" = FALSE
      AND "marketplaceApprovalStatus" = CAST('APPROVED'::text AS "MarketplaceApprovalStatus")))
ORDER BY
  build."projectId",
  build."createdAt" DESC,
  build.id;