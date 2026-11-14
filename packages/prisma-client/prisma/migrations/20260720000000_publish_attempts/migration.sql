CREATE FUNCTION create_production_build_expected(
  project_id text,
  deployment text,
  expected_version integer
) RETURNS text AS $$
DECLARE
  new_build_id text;
BEGIN
  INSERT INTO "Build" (
    version, "lastTransactionId", pages, breakpoints, styles, "styleSources",
    "styleSourceSelections", props, "dataSources", resources, instances,
    "marketplaceProduct", "projectSettings", "publishStatus", "projectId", id,
    deployment
  )
  SELECT
    version, "lastTransactionId", pages, breakpoints, styles, "styleSources",
    "styleSourceSelections", props, "dataSources", resources, instances,
    "marketplaceProduct", "projectSettings", "publishStatus", "projectId",
    extensions.uuid_generate_v4(), create_production_build_expected.deployment
  FROM "Build"
  WHERE "projectId" = project_id
    AND "Build".deployment IS NULL
    AND version = expected_version
  RETURNING id INTO new_build_id;

  RETURN new_build_id;
END;
$$ LANGUAGE plpgsql;
