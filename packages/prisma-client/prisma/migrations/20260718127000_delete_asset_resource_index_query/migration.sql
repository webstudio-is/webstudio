CREATE FUNCTION delete_asset_resource_index_query(
  p_project_id TEXT,
  p_resource_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      pg_catalog.jsonb_build_array(p_project_id, p_resource_id)::TEXT,
      0
    )
  );

  UPDATE public."AssetResourceIndexState"
  SET "activeRevision" = NULL,
    "buildStatus" = 'STALE',
    "buildError" = NULL,
    "deletedAt" = CURRENT_TIMESTAMP,
    "updatedAt" = CURRENT_TIMESTAMP
  WHERE "projectId" = p_project_id
    AND "resourceId" = p_resource_id
    AND "deletedAt" IS NULL;

  IF FOUND THEN
    UPDATE public."AssetResourceIndexRevision"
    SET "unreferencedAt" = COALESCE("unreferencedAt", CURRENT_TIMESTAMP)
    WHERE "projectId" = p_project_id
      AND "resourceId" = p_resource_id;
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;
