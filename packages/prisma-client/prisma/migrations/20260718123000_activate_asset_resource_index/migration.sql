CREATE FUNCTION begin_asset_resource_index_build(
  p_project_id TEXT,
  p_resource_id TEXT,
  p_query TEXT,
  p_query_hash TEXT,
  p_asset_revision TEXT,
  p_build_attempt_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      pg_catalog.jsonb_build_array(p_project_id, p_resource_id)::TEXT,
      0
    )
  );

  INSERT INTO public."AssetResourceIndexState" (
    "projectId",
    "resourceId",
    "query",
    "queryHash",
    "assetRevision",
    "buildAttemptId",
    "buildStatus",
    "buildError",
    "deletedAt",
    "updatedAt"
  ) VALUES (
    p_project_id,
    p_resource_id,
    p_query,
    p_query_hash,
    p_asset_revision,
    p_build_attempt_id,
    'BUILDING',
    NULL,
    NULL,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT ("projectId", "resourceId")
  DO UPDATE SET
    "query" = EXCLUDED."query",
    "queryHash" = EXCLUDED."queryHash",
    "assetRevision" = EXCLUDED."assetRevision",
    "buildAttemptId" = EXCLUDED."buildAttemptId",
    "buildStatus" = 'BUILDING',
    "buildError" = NULL,
    "deletedAt" = NULL,
    "updatedAt" = CURRENT_TIMESTAMP;
END;
$$;

CREATE FUNCTION activate_asset_resource_index(
  p_project_id TEXT,
  p_resource_id TEXT,
  p_revision TEXT,
  p_query_hash TEXT,
  p_asset_revision TEXT,
  p_build_attempt_id TEXT,
  p_checksum TEXT,
  p_object_key TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  existing_revision public."AssetResourceIndexRevision"%ROWTYPE;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      pg_catalog.jsonb_build_array(p_project_id, p_resource_id)::TEXT,
      0
    )
  );

  PERFORM 1
  FROM public."AssetResourceIndexState"
  WHERE "projectId" = p_project_id
    AND "resourceId" = p_resource_id
    AND "queryHash" = p_query_hash
    AND "assetRevision" = p_asset_revision
    AND "buildAttemptId" = p_build_attempt_id
    AND "buildStatus" = 'BUILDING'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public."AssetResourceIndexRevision" (
    "projectId",
    "resourceId",
    "revision",
    "queryHash",
    "assetRevision",
    "checksum",
    "objectKey"
  ) VALUES (
    p_project_id,
    p_resource_id,
    p_revision,
    p_query_hash,
    p_asset_revision,
    p_checksum,
    p_object_key
  )
  ON CONFLICT ("projectId", "resourceId", "revision") DO NOTHING;

  SELECT * INTO existing_revision
  FROM public."AssetResourceIndexRevision"
  WHERE "projectId" = p_project_id
    AND "resourceId" = p_resource_id
    AND "revision" = p_revision;

  IF existing_revision."queryHash" <> p_query_hash
    OR existing_revision."assetRevision" <> p_asset_revision
    OR existing_revision."checksum" <> p_checksum
    OR existing_revision."objectKey" <> p_object_key
    OR existing_revision."gcClaimId" IS NOT NULL
  THEN
    RAISE EXCEPTION 'Immutable resource index revision metadata conflicts';
  END IF;

  UPDATE public."AssetResourceIndexState"
  SET "activeRevision" = p_revision,
    "buildStatus" = 'ACTIVE',
    "buildError" = NULL,
    "updatedAt" = CURRENT_TIMESTAMP
  WHERE "projectId" = p_project_id
    AND "resourceId" = p_resource_id;

  UPDATE public."AssetResourceIndexRevision"
  SET "unreferencedAt" = CASE
    WHEN "revision" = p_revision THEN NULL
    ELSE COALESCE("unreferencedAt", CURRENT_TIMESTAMP)
  END
  WHERE "projectId" = p_project_id
    AND "resourceId" = p_resource_id;

  RETURN TRUE;
END;
$$;
