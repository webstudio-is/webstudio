BEGIN;

-- Canonical asset metadata

CREATE TABLE "AssetFileMetadata" (
  "projectId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "revision" TEXT NOT NULL,
  "metadataToken" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "document" JSONB NOT NULL,
  "fieldContributions" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AssetFileMetadata_pkey"
    PRIMARY KEY ("projectId", "assetId", "revision"),
  CONSTRAINT "AssetFileMetadata_document_identity_check"
    CHECK (
      jsonb_typeof("document") = 'object'
      AND "document"->>'_id' = "assetId"
      AND "document"->>'revision' = "revision"
    ),
  CONSTRAINT "AssetFileMetadata_field_contributions_check"
    CHECK (jsonb_typeof("fieldContributions") = 'array'),
  CONSTRAINT "AssetFileMetadata_assetId_projectId_fkey"
    FOREIGN KEY ("assetId", "projectId") REFERENCES "Asset"("id", "projectId")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "AssetFileMetadata_projectId_assetId_idx"
  ON "AssetFileMetadata"("projectId", "assetId");


-- Canonical metadata lifecycle

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
    "metadataToken" = gen_random_uuid()::TEXT,
    "document" = EXCLUDED."document",
    "fieldContributions" = EXCLUDED."fieldContributions",
    "updatedAt" = EXCLUDED."updatedAt"
  WHERE "AssetFileMetadata"."document" IS DISTINCT FROM EXCLUDED."document"
    OR "AssetFileMetadata"."fieldContributions" IS DISTINCT FROM EXCLUDED."fieldContributions";

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


-- Resource index state and immutable revisions

CREATE TYPE "AssetResourceIndexBuildStatus" AS ENUM (
  'PENDING',
  'BUILDING',
  'ACTIVE',
  'STALE',
  'FAILED'
);

CREATE TABLE "AssetResourceIndexState" (
  "projectId" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "query" TEXT NOT NULL,
  "queryHash" TEXT NOT NULL,
  "assetRevision" TEXT NOT NULL,
  "buildAttemptId" TEXT NOT NULL,
  "buildStatus" "AssetResourceIndexBuildStatus" NOT NULL DEFAULT 'PENDING',
  "activeRevision" TEXT,
  "buildError" JSONB,
  "deletedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AssetResourceIndexState_pkey"
    PRIMARY KEY ("projectId", "resourceId"),
  CONSTRAINT "AssetResourceIndexState_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AssetResourceIndexState_queryHash_check"
    CHECK ("queryHash" ~ '^sha256:[0-9a-f]{64}$'),
  CONSTRAINT "AssetResourceIndexState_query_check"
    CHECK (BTRIM("query") <> '' AND OCTET_LENGTH("query") <= 32768),
  CONSTRAINT "AssetResourceIndexState_assetRevision_check"
    CHECK ("assetRevision" ~ '^sha256:[0-9a-f]{64}$'),
  CONSTRAINT "AssetResourceIndexState_buildAttemptId_check"
    CHECK (BTRIM("buildAttemptId") <> ''),
  CONSTRAINT "AssetResourceIndexState_activeRevision_check"
    CHECK (
      "activeRevision" IS NULL
      OR "activeRevision" ~ '^sha256:[0-9a-f]{64}$'
    ),
  CONSTRAINT "AssetResourceIndexState_buildError_check"
    CHECK ("buildError" IS NULL OR jsonb_typeof("buildError") = 'object')
);

CREATE INDEX "AssetResourceIndexState_projectId_buildStatus_idx"
  ON "AssetResourceIndexState"("projectId", "buildStatus");

CREATE TABLE "AssetResourceIndexRevision" (
  "projectId" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "revision" TEXT NOT NULL,
  "queryHash" TEXT NOT NULL,
  "assetRevision" TEXT NOT NULL,
  "checksum" TEXT NOT NULL,
  "objectKey" TEXT NOT NULL,
  "unreferencedAt" TIMESTAMPTZ(3),
  "gcClaimId" TEXT,
  "gcStartedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AssetResourceIndexRevision_pkey"
    PRIMARY KEY ("projectId", "resourceId", "revision"),
  CONSTRAINT "AssetResourceIndexRevision_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AssetResourceIndexRevision_resource_fkey"
    FOREIGN KEY ("projectId", "resourceId")
    REFERENCES "AssetResourceIndexState"("projectId", "resourceId")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AssetResourceIndexRevision_revision_checksum_check"
    CHECK (
      "revision" ~ '^sha256:[0-9a-f]{64}$'
      AND "checksum" = "revision"
    ),
  CONSTRAINT "AssetResourceIndexRevision_queryHash_check"
    CHECK ("queryHash" ~ '^sha256:[0-9a-f]{64}$'),
  CONSTRAINT "AssetResourceIndexRevision_assetRevision_check"
    CHECK ("assetRevision" ~ '^sha256:[0-9a-f]{64}$'),
  CONSTRAINT "AssetResourceIndexRevision_objectKey_check"
    CHECK (BTRIM("objectKey") <> ''),
  CONSTRAINT "AssetResourceIndexRevision_gc_claim_check"
    CHECK (("gcClaimId" IS NULL) = ("gcStartedAt" IS NULL))
);

CREATE UNIQUE INDEX "AssetResourceIndexRevision_projectId_objectKey_key"
  ON "AssetResourceIndexRevision"("projectId", "objectKey");

CREATE INDEX "AssetResourceIndexRevision_lookup_idx"
  ON "AssetResourceIndexRevision"(
    "projectId",
    "resourceId",
    "queryHash",
    "assetRevision"
  );

ALTER TABLE "AssetResourceIndexState"
  ADD CONSTRAINT "AssetResourceIndexState_activeRevision_fkey"
  FOREIGN KEY ("projectId", "resourceId", "activeRevision")
  REFERENCES "AssetResourceIndexRevision"(
    "projectId",
    "resourceId",
    "revision"
  )
  ON DELETE NO ACTION ON UPDATE CASCADE;


-- Resource index build and activation lifecycle

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


-- Failed builds

CREATE FUNCTION fail_asset_resource_index_build(
  p_project_id TEXT,
  p_resource_id TEXT,
  p_query_hash TEXT,
  p_asset_revision TEXT,
  p_build_attempt_id TEXT,
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
    AND "buildAttemptId" = p_build_attempt_id
    AND "buildStatus" = 'BUILDING';

  RETURN FOUND;
END;
$$;


-- Cancelled builds

CREATE FUNCTION cancel_asset_resource_index_build(
  p_project_id TEXT,
  p_resource_id TEXT,
  p_query_hash TEXT,
  p_asset_revision TEXT,
  p_build_attempt_id TEXT
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
  SET "buildStatus" = 'STALE',
    "buildError" = NULL,
    "updatedAt" = CURRENT_TIMESTAMP
  WHERE "projectId" = p_project_id
    AND "resourceId" = p_resource_id
    AND "queryHash" = p_query_hash
    AND "assetRevision" = p_asset_revision
    AND "buildAttemptId" = p_build_attempt_id
    AND "buildStatus" = 'BUILDING';

  RETURN FOUND;
END;
$$;


-- Publication validation

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


-- Query deletion

CREATE FUNCTION delete_asset_resource_index_query(
  p_project_id TEXT,
  p_resource_id TEXT,
  p_build_id TEXT DEFAULT NULL,
  p_resources TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  IF asset_resource_index_source_matches(
    p_project_id,
    p_build_id,
    p_resources
  ) = FALSE THEN
    RETURN FALSE;
  END IF;

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


-- Revision references

CREATE TYPE "AssetResourceIndexReferenceType" AS ENUM (
  'RESOURCE',
  'BUILD',
  'DEPLOYMENT'
);

CREATE TABLE "AssetResourceIndexReference" (
  "projectId" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "revision" TEXT NOT NULL,
  "type" "AssetResourceIndexReferenceType" NOT NULL,
  "referenceId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AssetResourceIndexReference_pkey"
    PRIMARY KEY (
      "projectId",
      "resourceId",
      "revision",
      "type",
      "referenceId"
    ),
  CONSTRAINT "AssetResourceIndexReference_index_fkey"
    FOREIGN KEY ("projectId", "resourceId", "revision")
    REFERENCES "AssetResourceIndexRevision"(
      "projectId",
      "resourceId",
      "revision"
    )
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AssetResourceIndexReference_referenceId_check"
    CHECK (BTRIM("referenceId") <> '')
);

CREATE INDEX "AssetResourceIndexReference_owner_idx"
  ON "AssetResourceIndexReference"("projectId", "type", "referenceId");

CREATE FUNCTION add_asset_resource_index_reference(
  p_project_id TEXT,
  p_resource_id TEXT,
  p_revision TEXT,
  p_type "AssetResourceIndexReferenceType",
  p_reference_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM 1
  FROM public."AssetResourceIndexRevision"
  WHERE "projectId" = p_project_id
    AND "resourceId" = p_resource_id
    AND "revision" = p_revision
    AND "gcClaimId" IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Resource index revision is missing or being collected';
  END IF;

  INSERT INTO public."AssetResourceIndexReference" (
    "projectId", "resourceId", "revision", "type", "referenceId"
  ) VALUES (
    p_project_id, p_resource_id, p_revision, p_type, p_reference_id
  )
  ON CONFLICT DO NOTHING;
END;
$$;

CREATE FUNCTION remove_asset_resource_index_reference(
  p_project_id TEXT,
  p_type "AssetResourceIndexReferenceType",
  p_reference_id TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  removed INTEGER;
BEGIN
  DELETE FROM public."AssetResourceIndexReference"
  WHERE "projectId" = p_project_id
    AND "type" = p_type
    AND "referenceId" = p_reference_id;
  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END;
$$;


-- Revision garbage collection

CREATE FUNCTION claim_asset_resource_index_garbage(
  p_before TIMESTAMPTZ,
  p_limit INTEGER
)
RETURNS TABLE (
  "projectId" TEXT,
  "resourceId" TEXT,
  revision TEXT,
  "objectKey" TEXT,
  "gcClaimId" TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_limit <= 0 OR p_limit > 1000 THEN
    RAISE EXCEPTION 'Resource index garbage collection limit is invalid';
  END IF;
  RETURN QUERY
  WITH candidates AS (
    SELECT candidate.ctid
    FROM public."AssetResourceIndexRevision" AS candidate
    WHERE candidate."unreferencedAt" <= p_before
      AND (
        candidate."gcClaimId" IS NULL
        -- Object deletion is idempotent, so an interrupted worker's claim can
        -- safely be rotated and resumed after its lease expires.
        OR candidate."gcStartedAt" <= CURRENT_TIMESTAMP - INTERVAL '15 minutes'
      )
      AND NOT EXISTS (
        SELECT 1 FROM public."AssetResourceIndexReference" AS reference
        WHERE reference."projectId" = candidate."projectId"
          AND reference."resourceId" = candidate."resourceId"
          AND reference.revision = candidate.revision
          -- BUILD references protect only an in-flight snapshot operation.
          -- Expiring abandoned references prevents a failed cleanup request
          -- from retaining an immutable object forever.
          AND (
            reference.type <> 'BUILD'
            OR reference."createdAt" > CURRENT_TIMESTAMP - INTERVAL '24 hours'
          )
      )
      AND NOT EXISTS (
        SELECT 1 FROM public."AssetResourceIndexState" AS state
        WHERE state."projectId" = candidate."projectId"
          AND state."resourceId" = candidate."resourceId"
          AND state."activeRevision" = candidate.revision
      )
    ORDER BY candidate."unreferencedAt", candidate."projectId",
      candidate."resourceId", candidate.revision
    FOR UPDATE SKIP LOCKED
    LIMIT p_limit
  )
  UPDATE public."AssetResourceIndexRevision" AS claimed
  SET "gcClaimId" = gen_random_uuid()::TEXT,
    "gcStartedAt" = CURRENT_TIMESTAMP
  FROM candidates
  WHERE claimed.ctid = candidates.ctid
  RETURNING claimed."projectId", claimed."resourceId", claimed.revision,
    claimed."objectKey", claimed."gcClaimId";
END;
$$;

CREATE FUNCTION finalize_asset_resource_index_garbage(
  p_project_id TEXT,
  p_resource_id TEXT,
  p_revision TEXT,
  p_gc_claim_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public."AssetResourceIndexRevision" AS candidate
  WHERE candidate."projectId" = p_project_id
    AND candidate."resourceId" = p_resource_id
    AND candidate.revision = p_revision
    AND candidate."gcClaimId" = p_gc_claim_id
    AND NOT EXISTS (
      SELECT 1 FROM public."AssetResourceIndexReference" AS reference
      WHERE reference."projectId" = candidate."projectId"
        AND reference."resourceId" = candidate."resourceId"
        AND reference.revision = candidate.revision
        AND (
          reference.type <> 'BUILD'
          OR reference."createdAt" > CURRENT_TIMESTAMP - INTERVAL '24 hours'
        )
    )
    AND NOT EXISTS (
      SELECT 1 FROM public."AssetResourceIndexState" AS state
      WHERE state."projectId" = candidate."projectId"
        AND state."resourceId" = candidate."resourceId"
        AND state."activeRevision" = candidate.revision
    );
  RETURN FOUND;
END;
$$;

CREATE FUNCTION release_asset_resource_index_garbage_claim(
  p_project_id TEXT,
  p_resource_id TEXT,
  p_revision TEXT,
  p_gc_claim_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public."AssetResourceIndexRevision"
  SET "gcClaimId" = NULL, "gcStartedAt" = NULL
  WHERE "projectId" = p_project_id
    AND "resourceId" = p_resource_id
    AND revision = p_revision
    AND "gcClaimId" = p_gc_claim_id;
  RETURN FOUND;
END;
$$;


COMMIT;
