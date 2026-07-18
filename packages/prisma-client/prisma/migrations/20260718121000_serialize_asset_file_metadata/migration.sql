CREATE FUNCTION replace_asset_file_metadata(
  p_project_id TEXT,
  p_asset_id TEXT,
  p_revision TEXT,
  p_document JSONB,
  p_field_contributions JSONB,
  p_source JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      pg_catalog.jsonb_build_array(p_project_id, p_asset_id)::TEXT,
      0
    )
  );

  PERFORM 1
  FROM public."Asset" AS asset
  INNER JOIN public."File" AS file ON file."name" = asset."name"
  WHERE asset."projectId" = p_project_id
    AND asset."id" = p_asset_id
    AND asset."filename" IS NOT DISTINCT FROM p_source->>'filename'
    AND asset."folderId" IS NOT DISTINCT FROM p_source->>'folderId'
    AND file."name" = p_source->>'storageName'
    AND file."updatedAt" = (p_source->>'fileUpdatedAt')::TIMESTAMPTZ
    AND file."size" = (p_source->>'fileSize')::INTEGER
    AND file."status" = 'UPLOADED'
  FOR UPDATE OF asset, file;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public."AssetFileMetadata" (
    "projectId",
    "assetId",
    "revision",
    "document",
    "fieldContributions",
    "updatedAt"
  ) VALUES (
    p_project_id,
    p_asset_id,
    p_revision,
    p_document,
    p_field_contributions,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT ("projectId", "assetId", "revision")
  DO UPDATE SET
    "document" = EXCLUDED."document",
    "fieldContributions" = EXCLUDED."fieldContributions",
    "updatedAt" = EXCLUDED."updatedAt";

  DELETE FROM public."AssetFileMetadata"
  WHERE "projectId" = p_project_id
    AND "assetId" = p_asset_id
    AND "revision" <> p_revision;

  RETURN TRUE;
END;
$$;

CREATE FUNCTION delete_stale_asset_file_metadata(
  p_project_id TEXT,
  p_asset_ids TEXT[]
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  asset_id TEXT;
  deleted_count INTEGER;
  total_deleted INTEGER := 0;
BEGIN
  FOR asset_id IN
    SELECT DISTINCT requested_asset_id
    FROM pg_catalog.unnest(p_asset_ids) AS requested_asset_id
    ORDER BY requested_asset_id
  LOOP
    PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        pg_catalog.jsonb_build_array(p_project_id, asset_id)::TEXT,
        0
      )
    );

    IF NOT EXISTS (
      SELECT 1
      FROM public."Asset" AS asset
      INNER JOIN public."File" AS file ON file."name" = asset."name"
      WHERE asset."projectId" = p_project_id
        AND asset."id" = asset_id
        AND file."status" = 'UPLOADED'
        AND file."name" ~* '\.md$'
    ) THEN
      DELETE FROM public."AssetFileMetadata"
      WHERE "projectId" = p_project_id
        AND "assetId" = asset_id;
      GET DIAGNOSTICS deleted_count = ROW_COUNT;
      total_deleted := total_deleted + deleted_count;
    END IF;
  END LOOP;

  RETURN total_deleted;
END;
$$;
