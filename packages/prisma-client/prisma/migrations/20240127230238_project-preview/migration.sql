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

-- Update DashboardProject View
CREATE
OR REPLACE VIEW "DashboardProject" AS
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