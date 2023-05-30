-- Drop DashboardProject View
DROP VIEW IF EXISTS "DashboardProject";

-- AlterTable

ALTER TABLE "Build"
  ADD COLUMN     "deployment" TEXT;

UPDATE "Build"
  SET "deployment" = '{"domains":[]}'
  WHERE "isDev" = false;


ALTER TABLE "Build"
  DROP COLUMN "isDev",
  DROP COLUMN "isProd";

-- CreateIndexes
CREATE UNIQUE INDEX "Build_id_key" ON "Build"("id");
-- Ensure that only single "dev" build per project exists
CREATE UNIQUE INDEX "Build_dev_index" ON "Build" ("projectId") WHERE "deployment" IS NULL;

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