BEGIN;

CREATE TABLE "AssetFileMetadata" (
  "projectId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "revision" TEXT NOT NULL,
  "document" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AssetFileMetadata_pkey"
    PRIMARY KEY ("projectId", "assetId"),
  CONSTRAINT "AssetFileMetadata_document_identity_check"
    CHECK ((
      jsonb_typeof("document") = 'object'
      AND jsonb_typeof("document"->'_id') = 'string'
      AND "document"->>'_id' = "assetId"
      AND jsonb_typeof("document"->'revision') = 'string'
      AND "document"->>'revision' = "revision"
    ) IS TRUE),
  CONSTRAINT "AssetFileMetadata_assetId_projectId_fkey"
    FOREIGN KEY ("assetId", "projectId") REFERENCES "Asset"("id", "projectId")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE FUNCTION replace_asset_file_metadata(
  p_project_id TEXT,
  p_asset_id TEXT,
  p_revision TEXT,
  p_document JSONB,
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
    "updatedAt"
  ) VALUES (
    p_project_id,
    p_asset_id,
    p_revision,
    p_document,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT ("projectId", "assetId")
  DO UPDATE SET
    "revision" = EXCLUDED."revision",
    "document" = EXCLUDED."document",
    "updatedAt" = EXCLUDED."updatedAt"
  WHERE "AssetFileMetadata"."revision" IS DISTINCT FROM EXCLUDED."revision"
    OR "AssetFileMetadata"."document" IS DISTINCT FROM EXCLUDED."document";

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
