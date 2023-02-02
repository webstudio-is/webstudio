-- AlterTable
ALTER TABLE
  "Project"
ADD
  COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

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
      AND "Build"."isProd" = true
  ) AS "isPublished"
FROM
  "Project";