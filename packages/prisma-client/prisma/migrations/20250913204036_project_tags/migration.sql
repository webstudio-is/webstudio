ALTER TABLE "Project" ADD COLUMN "tags" TEXT[];

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
  (EXISTS (
    SELECT 1
    FROM "Build"
    WHERE "Build"."projectId" = "Project".id
    AND "Build".deployment IS NOT NULL)
  ) AS "isPublished"
FROM "Project";

DROP VIEW IF EXISTS project_tag;
CREATE VIEW project_tag AS
SELECT DISTINCT "userId" as user_id, unnest(tags) AS tag
FROM "Project" AS project;
