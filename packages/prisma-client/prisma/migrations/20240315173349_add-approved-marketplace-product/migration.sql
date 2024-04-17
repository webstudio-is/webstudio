-- CreateIndex
CREATE INDEX "Build_projectId_createdAt_idx" ON "Build"("projectId", "createdAt" DESC);
COMMENT ON INDEX "Build_projectId_createdAt_idx" IS 'Used to speedup ApprovedMarketplaceProduct view';

-- CreateIndex
CREATE INDEX "Project_isDeleted_marketplaceApprovalStatus_idx" ON "Project"("isDeleted", "marketplaceApprovalStatus");
COMMENT ON INDEX "Project_isDeleted_marketplaceApprovalStatus_idx" IS 'Used to speedup ApprovedMarketplaceProduct view';

CREATE VIEW "ApprovedMarketplaceProduct" AS
SELECT DISTINCT ON (build."projectId")
  build."projectId",
  build."marketplaceProduct"
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

COMMENT ON VIEW "ApprovedMarketplaceProduct" IS '
Get latest published build.marketplaceProduct
for a non deleted projects with marketplaceApprovalStatus=APPROVED
';
