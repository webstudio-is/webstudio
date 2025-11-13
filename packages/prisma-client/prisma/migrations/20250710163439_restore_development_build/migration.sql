DROP FUNCTION IF EXISTS restore_development_build;
CREATE FUNCTION restore_development_build(
  project_id  text,
  from_build_id text
) RETURNS text AS $$
BEGIN
  UPDATE "Build"
  SET
    "version" = source."version",
    "lastTransactionId" = source."lastTransactionId",
    "pages" = source."pages",
    "breakpoints" = source."breakpoints",
    "styles" = source."styles",
    "styleSources" = source."styleSources",
    "styleSourceSelections" = source."styleSourceSelections",
    "props" = source."props",
    "dataSources" = source."dataSources",
    "resources" = source."resources",
    "instances" = source."instances",
    "marketplaceProduct" = source."marketplaceProduct"
  FROM (
    SELECT * FROM "Build"
    WHERE "projectId" = project_id AND "id" = from_build_id
  ) as source
  WHERE "Build"."projectId" = project_id AND "Build"."deployment" IS NULL;
  RETURN 'OK';
END;
$$ LANGUAGE plpgsql;

DROP VIEW IF EXISTS published_builds;
CREATE VIEW published_builds AS
SELECT
  build.id AS "buildId",
  build."projectId",
  build."createdAt",
  (
    SELECT string_agg(list.value, ', ')
    FROM jsonb_array_elements_text(build.deployment::jsonb -> 'domains') AS list(value)
  ) AS domains
FROM "Build" as build
WHERE build.deployment IS NOT NULL
  AND build."isCleaned"=FALSE
ORDER BY build."projectId", build."createdAt" DESC;
