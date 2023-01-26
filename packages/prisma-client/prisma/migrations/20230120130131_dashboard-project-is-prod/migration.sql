-- AlterTable
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
      AND "Build"."isProd" = true
  ) AS "isPublished"
FROM
  "Project";