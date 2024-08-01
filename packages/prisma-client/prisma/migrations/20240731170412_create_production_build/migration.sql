DROP FUNCTION IF EXISTS create_production_build;
CREATE FUNCTION create_production_build(
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
    "publishStatus",
    "projectId",
    extensions.uuid_generate_v4() as id,
    create_production_build.deployment as deployment
  FROM "Build"
  WHERE "projectId" = project_id AND "Build"."deployment" IS NULL
  RETURNING "id" INTO new_build_id;

  RETURN new_build_id;
END;
$$ LANGUAGE plpgsql;
