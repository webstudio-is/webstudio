BEGIN;

DROP FUNCTION public.replace_asset_file_metadata(
  TEXT,
  TEXT,
  TEXT,
  JSONB,
  JSONB,
  JSONB
);

-- The original RPC keeps one active revision, but retain the newest row if a
-- direct database write ever bypassed that invariant before adding the key.
DELETE FROM public."AssetFileMetadata"
WHERE ctid IN (
  SELECT ctid
  FROM (
    SELECT
      ctid,
      ROW_NUMBER() OVER (
        PARTITION BY "projectId", "assetId"
        ORDER BY "updatedAt" DESC, "revision" DESC
      ) AS position
    FROM public."AssetFileMetadata"
  ) AS revisions
  WHERE position > 1
);

ALTER TABLE public."AssetFileMetadata"
  DROP CONSTRAINT "AssetFileMetadata_pkey",
  DROP CONSTRAINT "AssetFileMetadata_field_contributions_check",
  DROP COLUMN "metadataToken",
  DROP COLUMN "fieldContributions",
  ADD CONSTRAINT "AssetFileMetadata_pkey" PRIMARY KEY ("projectId", "assetId");

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

COMMIT;
