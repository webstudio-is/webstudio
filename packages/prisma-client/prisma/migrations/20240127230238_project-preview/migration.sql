ALTER TABLE
  "public"."Project"
ADD
  COLUMN "previewImageAssetId" text;

-- AddForeignKey
ALTER TABLE
  "Project"
ADD
  CONSTRAINT "Project_previewImageAssetId_id_fkey" FOREIGN KEY ("previewImageAssetId", "id") REFERENCES "Asset"("id", "projectId") ON DELETE
SET
  NULL;

-- Drop DashboardProject View
DROP VIEW IF EXISTS "DashboardProject";

-- Update DashboardProject View
CREATE VIEW "DashboardProject" AS
SELECT
  *,
  EXISTS (
    SELECT
      1
    from
      "Build"
    WHERE
      "Build"."projectId" = "Project".id
      AND "Build"."deployment" IS NOT NULL
  ) AS "isPublished"
FROM
  "Project";