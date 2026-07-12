ALTER TABLE "Build"
ADD COLUMN "projectSettings" TEXT;

UPDATE "Build"
SET "projectSettings" = json_build_object(
  'meta', COALESCE(pages::json->'meta', '{}'::json),
  'compiler', COALESCE(pages::json->'compiler', '{}'::json)
)::text;

ALTER TABLE "Build"
ALTER COLUMN "projectSettings" SET DEFAULT '{"meta":{},"compiler":{}}',
ALTER COLUMN "projectSettings" SET NOT NULL;

CREATE OR REPLACE FUNCTION create_production_build(
  project_id text,
  deployment text
) RETURNS text AS $$
DECLARE
  new_build_id text;
BEGIN
  INSERT INTO "Build" (
    version,
    "lastTransactionId",
    pages,
    breakpoints,
    styles,
    "styleSources",
    "styleSourceSelections",
    props,
    "dataSources",
    resources,
    instances,
    "marketplaceProduct",
    "projectSettings",
    "publishStatus",
    "projectId",
    id,
    deployment
  )
  SELECT
    version,
    "lastTransactionId",
    pages,
    breakpoints,
    styles,
    "styleSources",
    "styleSourceSelections",
    props,
    "dataSources",
    resources,
    instances,
    "marketplaceProduct",
    "projectSettings",
    "publishStatus",
    "projectId",
    extensions.uuid_generate_v4(),
    create_production_build.deployment
  FROM "Build"
  WHERE "projectId" = project_id AND "Build".deployment IS NULL
  RETURNING id INTO new_build_id;

  RETURN new_build_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION database_cleanup(
  from_date timestamp DEFAULT '2020-01-01 00:00:00',
  to_date timestamp DEFAULT '2099-12-31 23:59:59'
) RETURNS void AS $$
BEGIN
  WITH latest_builds AS (
    SELECT "buildId" FROM "Project" p, LATERAL "latestProjectDomainBuildVirtual"(p)
    UNION
    SELECT "buildId" FROM "Project" p, LATERAL "latestBuildVirtual"(p)
    UNION
    SELECT lb."buildId"
    FROM "Project" p, LATERAL "domainsVirtual"(p) dv, LATERAL "latestBuildVirtual"(dv) lb
  )
  UPDATE "Build"
  SET
    "styleSources" = '[]',
    styles = '[]',
    breakpoints = '[]',
    "styleSourceSelections" = '[]',
    props = '[]',
    instances = '[]',
    "dataSources" = '[]',
    resources = '[]',
    "marketplaceProduct" = '{}',
    "projectSettings" = '{"meta":{},"compiler":{}}',
    "isCleaned" = true
  WHERE deployment IS NOT NULL
    AND id NOT IN (SELECT "buildId" FROM latest_builds)
    AND "isCleaned" = false
    AND "createdAt" BETWEEN from_date AND to_date;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION restore_development_build(
  project_id text,
  from_build_id text
) RETURNS text AS $$
BEGIN
  UPDATE "Build"
  SET
    version = source.version,
    "lastTransactionId" = source."lastTransactionId",
    pages = source.pages,
    breakpoints = source.breakpoints,
    styles = source.styles,
    "styleSources" = source."styleSources",
    "styleSourceSelections" = source."styleSourceSelections",
    props = source.props,
    "dataSources" = source."dataSources",
    resources = source.resources,
    instances = source.instances,
    "marketplaceProduct" = source."marketplaceProduct",
    "projectSettings" = source."projectSettings"
  FROM (
    SELECT * FROM "Build"
    WHERE "projectId" = project_id AND id = from_build_id
  ) AS source
  WHERE "Build"."projectId" = project_id AND "Build".deployment IS NULL;
  RETURN 'OK';
END;
$$ LANGUAGE plpgsql;
