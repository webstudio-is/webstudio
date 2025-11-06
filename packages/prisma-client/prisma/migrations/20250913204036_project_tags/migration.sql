ALTER TABLE
  "Project"
ADD
  COLUMN "tags" TEXT [];

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

-- AlterTable
ALTER TABLE
  "User"
ADD
  COLUMN "projectsTags" JSONB;