CREATE FUNCTION invalidate_asset_resource_indexes(p_project_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public."AssetResourceIndexState"
  SET "buildAttemptId" = gen_random_uuid()::TEXT,
    "buildStatus" = (CASE
      WHEN "activeRevision" IS NULL THEN 'PENDING'
      ELSE 'STALE'
    END)::"AssetResourceIndexBuildStatus",
    "buildError" = NULL,
    "updatedAt" = CURRENT_TIMESTAMP
  WHERE "projectId" = p_project_id
    AND "deletedAt" IS NULL;
END;
$$;

CREATE FUNCTION invalidate_asset_resource_indexes_after_metadata_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM invalidate_asset_resource_indexes(
    COALESCE(NEW."projectId", OLD."projectId")
  );
  RETURN NULL;
END;
$$;

CREATE TRIGGER invalidate_asset_resource_indexes_after_metadata_change
AFTER INSERT OR UPDATE OR DELETE ON public."AssetFileMetadata"
FOR EACH ROW
EXECUTE FUNCTION invalidate_asset_resource_indexes_after_metadata_change();

CREATE FUNCTION invalidate_asset_resource_indexes_after_resource_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.resources IS DISTINCT FROM OLD.resources THEN
    PERFORM invalidate_asset_resource_indexes(NEW."projectId");
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER invalidate_asset_resource_indexes_after_resource_change
AFTER UPDATE OF resources ON public."Build"
FOR EACH ROW
EXECUTE FUNCTION invalidate_asset_resource_indexes_after_resource_change();

CREATE FUNCTION asset_file_metadata_snapshot_matches(
  p_project_id TEXT,
  p_metadata_snapshot JSONB
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT NOT EXISTS (
    (
      SELECT metadata."assetId", metadata."metadataToken"
      FROM public."AssetFileMetadata" AS metadata
      WHERE metadata."projectId" = p_project_id
      EXCEPT
      SELECT snapshot."assetId", snapshot."metadataToken"
      FROM jsonb_to_recordset(p_metadata_snapshot) AS snapshot(
        "assetId" TEXT,
        "metadataToken" TEXT
      )
    )
    UNION ALL
    (
      SELECT snapshot."assetId", snapshot."metadataToken"
      FROM jsonb_to_recordset(p_metadata_snapshot) AS snapshot(
        "assetId" TEXT,
        "metadataToken" TEXT
      )
      EXCEPT
      SELECT metadata."assetId", metadata."metadataToken"
      FROM public."AssetFileMetadata" AS metadata
      WHERE metadata."projectId" = p_project_id
    )
  );
$$;

CREATE FUNCTION asset_resource_index_source_matches(
  p_project_id TEXT,
  p_build_id TEXT,
  p_resources TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  IF (p_build_id IS NULL) <> (p_resources IS NULL) THEN
    RAISE EXCEPTION 'Resource index source is incomplete';
  END IF;

  IF p_build_id IS NULL THEN
    RETURN TRUE;
  END IF;

  PERFORM 1
  FROM public."Build"
  WHERE "projectId" = p_project_id
    AND "id" = p_build_id
    AND resources::JSONB = p_resources::JSONB
  FOR SHARE;

  RETURN FOUND;
END;
$$;

CREATE FUNCTION begin_asset_resource_index_build(
  p_project_id TEXT,
  p_resource_id TEXT,
  p_query TEXT,
  p_query_hash TEXT,
  p_asset_revision TEXT,
  p_build_attempt_id TEXT,
  p_metadata_snapshot JSONB DEFAULT '[]'::JSONB,
  p_build_id TEXT DEFAULT NULL,
  p_resources TEXT DEFAULT NULL,
  p_revision TEXT DEFAULT NULL,
  p_checksum TEXT DEFAULT NULL,
  p_object_key TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT (
    (p_revision IS NULL AND p_checksum IS NULL AND p_object_key IS NULL)
    OR
    (p_revision IS NOT NULL AND p_checksum IS NOT NULL AND p_object_key IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'Resource index revision registration is incomplete';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      pg_catalog.jsonb_build_array(p_project_id, p_resource_id)::TEXT,
      0
    )
  );

  IF asset_file_metadata_snapshot_matches(
    p_project_id,
    p_metadata_snapshot
  ) = FALSE THEN
    RETURN FALSE;
  END IF;

  IF asset_resource_index_source_matches(
    p_project_id,
    p_build_id,
    p_resources
  ) = FALSE THEN
    RETURN FALSE;
  END IF;

  IF p_build_id IS NULL AND EXISTS (
    SELECT 1
    FROM public."AssetResourceIndexState"
    WHERE "projectId" = p_project_id
      AND "resourceId" = p_resource_id
      AND ("queryHash" <> p_query_hash OR "deletedAt" IS NOT NULL)
  ) THEN
    RETURN FALSE;
  END IF;

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

  IF p_revision IS NOT NULL THEN
    INSERT INTO public."AssetResourceIndexRevision" (
      "projectId",
      "resourceId",
      "revision",
      "queryHash",
      "assetRevision",
      "checksum",
      "objectKey",
      "unreferencedAt"
    ) VALUES (
      p_project_id,
      p_resource_id,
      p_revision,
      p_query_hash,
      p_asset_revision,
      p_checksum,
      p_object_key,
      CURRENT_TIMESTAMP + INTERVAL '24 hours'
    )
    ON CONFLICT ("projectId", "resourceId", "revision")
    DO UPDATE SET "unreferencedAt" = CASE
      WHEN "AssetResourceIndexRevision"."unreferencedAt" IS NULL THEN NULL
      ELSE GREATEST(
        "AssetResourceIndexRevision"."unreferencedAt",
        CURRENT_TIMESTAMP + INTERVAL '24 hours'
      )
    END
    WHERE "AssetResourceIndexRevision"."gcClaimId" IS NULL;

    PERFORM 1
    FROM public."AssetResourceIndexRevision"
    WHERE "projectId" = p_project_id
      AND "resourceId" = p_resource_id
      AND revision = p_revision
      AND "queryHash" = p_query_hash
      AND "assetRevision" = p_asset_revision
      AND checksum = p_checksum
      AND "objectKey" = p_object_key
      AND "gcClaimId" IS NULL
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Immutable resource index revision metadata conflicts';
    END IF;
  END IF;

  RETURN TRUE;
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
  p_object_key TEXT,
  p_metadata_snapshot JSONB DEFAULT '[]'::JSONB,
  p_build_id TEXT DEFAULT NULL,
  p_resources TEXT DEFAULT NULL
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

  INSERT INTO public."AssetResourceIndexRevision" (
    "projectId",
    "resourceId",
    "revision",
    "queryHash",
    "assetRevision",
    "checksum",
    "objectKey",
    "unreferencedAt"
  ) VALUES (
    p_project_id,
    p_resource_id,
    p_revision,
    p_query_hash,
    p_asset_revision,
    p_checksum,
    p_object_key,
    CURRENT_TIMESTAMP
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

  IF asset_file_metadata_snapshot_matches(
    p_project_id,
    p_metadata_snapshot
  ) = FALSE THEN
    RETURN FALSE;
  END IF;

  IF asset_resource_index_source_matches(
    p_project_id,
    p_build_id,
    p_resources
  ) = FALSE THEN
    RETURN FALSE;
  END IF;

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
