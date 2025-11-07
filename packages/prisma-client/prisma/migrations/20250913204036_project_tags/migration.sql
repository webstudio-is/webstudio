ALTER TABLE
  "Project"
ADD
  COLUMN IF NOT EXISTS "tags" TEXT [];

ALTER TABLE
  "User"
ADD
  COLUMN IF NOT EXISTS "projectsTags" JSONB NOT NULL DEFAULT '[]';

DROP VIEW IF EXISTS "DashboardProject";

CREATE VIEW "DashboardProject" AS
SELECT
  id,
  title,
  tags,
  domain,
  "userId",
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