CREATE FUNCTION get_unpublishable_asset_resource_indexes(
  p_project_id TEXT,
  p_resources JSONB,
  p_asset_revision TEXT
)
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
  WITH required AS (
    SELECT
      resource->>'resourceId' AS resource_id,
      resource->>'queryHash' AS query_hash
    FROM pg_catalog.jsonb_array_elements(p_resources) AS resource
  ),
  checked AS (
    SELECT
      required.resource_id,
      CASE
        WHEN state."resourceId" IS NULL THEN 'MISSING_STATE'
        WHEN state."queryHash" <> required.query_hash THEN 'QUERY_HASH_MISMATCH'
        WHEN state."assetRevision" <> p_asset_revision THEN 'ASSET_REVISION_MISMATCH'
        WHEN state."buildStatus" <> 'ACTIVE' THEN 'BUILD_NOT_ACTIVE'
        WHEN state."activeRevision" IS NULL THEN 'MISSING_ACTIVE_REVISION'
        WHEN revision."revision" IS NULL THEN 'MISSING_ACTIVE_REVISION'
        WHEN revision."queryHash" <> required.query_hash
          THEN 'INDEX_QUERY_HASH_MISMATCH'
        WHEN revision."assetRevision" <> p_asset_revision
          THEN 'INDEX_ASSET_REVISION_MISMATCH'
        WHEN revision."checksum" <> revision."revision"
          THEN 'INDEX_CHECKSUM_MISMATCH'
        ELSE NULL
      END AS reason
    FROM required
    LEFT JOIN public."AssetResourceIndexState" AS state
      ON state."projectId" = p_project_id
      AND state."resourceId" = required.resource_id
    LEFT JOIN public."AssetResourceIndexRevision" AS revision
      ON revision."projectId" = state."projectId"
      AND revision."resourceId" = state."resourceId"
      AND revision."revision" = state."activeRevision"
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'resourceId', checked.resource_id,
        'reason', checked.reason
      )
      ORDER BY checked.resource_id
    ) FILTER (WHERE checked.reason IS NOT NULL),
    '[]'::JSONB
  )
  FROM checked;
$$;
