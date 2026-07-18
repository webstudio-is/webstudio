CREATE FUNCTION fail_asset_resource_index_build(
  p_project_id TEXT,
  p_resource_id TEXT,
  p_query_hash TEXT,
  p_asset_revision TEXT,
  p_build_error JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  IF jsonb_typeof(p_build_error) <> 'object' THEN
    RAISE EXCEPTION 'Resource index build error must be an object';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      pg_catalog.jsonb_build_array(p_project_id, p_resource_id)::TEXT,
      0
    )
  );

  UPDATE public."AssetResourceIndexState"
  SET "buildStatus" = 'FAILED',
    "buildError" = p_build_error,
    "updatedAt" = CURRENT_TIMESTAMP
  WHERE "projectId" = p_project_id
    AND "resourceId" = p_resource_id
    AND "queryHash" = p_query_hash
    AND "assetRevision" = p_asset_revision
    AND "buildStatus" = 'BUILDING';

  RETURN FOUND;
END;
$$;
