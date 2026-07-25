BEGIN;

CREATE FUNCTION delete_asset_file_metadata_if_matches(
  p_project_id TEXT,
  p_asset_id TEXT,
  p_revision TEXT,
  p_document JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      pg_catalog.jsonb_build_array(p_project_id, p_asset_id)::TEXT,
      0
    )
  );

  DELETE FROM public."AssetFileMetadata"
  WHERE "projectId" = p_project_id
    AND "assetId" = p_asset_id
    AND "revision" = p_revision
    AND "document" = p_document;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

COMMIT;
