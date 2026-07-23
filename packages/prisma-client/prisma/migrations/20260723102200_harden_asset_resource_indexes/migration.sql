BEGIN;

-- Reject JSON nulls and non-string identity fields. The original constraint
-- allowed them because SQL NULL satisfies a CHECK expression.
ALTER TABLE "AssetFileMetadata"
  DROP CONSTRAINT "AssetFileMetadata_document_identity_check",
  ADD CONSTRAINT "AssetFileMetadata_document_identity_check"
    CHECK ((
      jsonb_typeof("document") = 'object'
      AND jsonb_typeof("document"->'_id') = 'string'
      AND "document"->>'_id' = "assetId"
      AND jsonb_typeof("document"->'revision') = 'string'
      AND "document"->>'revision' = "revision"
    ) IS TRUE);

-- The primary key already provides the same leading-column lookup.
DROP INDEX "AssetFileMetadata_projectId_assetId_idx";

CREATE INDEX "AssetResourceIndexRevision_garbage_idx"
  ON "AssetResourceIndexRevision"(
    "unreferencedAt",
    "projectId",
    "resourceId",
    "revision"
  )
  WHERE "unreferencedAt" IS NOT NULL;

-- Soft deletion makes every project-owned revision eligible for the same
-- resource-scoped, best-effort cleanup used after normal index changes.
CREATE FUNCTION retire_asset_resource_indexes_on_project_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD."isDeleted" IS DISTINCT FROM TRUE AND NEW."isDeleted" = TRUE THEN
    UPDATE public."AssetResourceIndexState"
    SET "activeRevision" = NULL,
      "buildStatus" = 'STALE',
      "buildError" = NULL,
      "deletedAt" = COALESCE("deletedAt", CURRENT_TIMESTAMP),
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "projectId" = NEW.id;

    UPDATE public."AssetResourceIndexRevision"
    SET "unreferencedAt" = COALESCE("unreferencedAt", CURRENT_TIMESTAMP)
    WHERE "projectId" = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "Project_retire_asset_resource_indexes"
AFTER UPDATE OF "isDeleted" ON "Project"
FOR EACH ROW
EXECUTE FUNCTION retire_asset_resource_indexes_on_project_delete();

CREATE OR REPLACE FUNCTION invalidate_asset_resource_indexes_after_resource_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.resources IS DISTINCT FROM OLD.resources THEN
    WITH previous_resources AS (
      SELECT resource
      FROM jsonb_array_elements(OLD.resources::JSONB) AS item(resource)
    ),
    current_resources AS (
      SELECT resource
      FROM jsonb_array_elements(NEW.resources::JSONB) AS item(resource)
    ),
    changed_resources AS (
      SELECT COALESCE(
        previous.resource->>'id',
        current.resource->>'id'
      ) AS resource_id
      FROM previous_resources AS previous
      FULL JOIN current_resources AS current
        ON current.resource->>'id' = previous.resource->>'id'
      -- Keep these index-affecting fields aligned with
      -- synchronizeAssetResourceIndexQueries in asset-uploader.
      WHERE previous.resource->'control'
          IS DISTINCT FROM current.resource->'control'
        OR previous.resource->'method'
          IS DISTINCT FROM current.resource->'method'
        OR previous.resource->'url'
          IS DISTINCT FROM current.resource->'url'
        OR previous.resource->'body'
          IS DISTINCT FROM current.resource->'body'
    )
    UPDATE public."AssetResourceIndexState" AS state
    SET "buildAttemptId" = gen_random_uuid()::TEXT,
      "buildStatus" = (CASE
        WHEN state."activeRevision" IS NULL THEN 'PENDING'
        ELSE 'STALE'
      END)::"AssetResourceIndexBuildStatus",
      "buildError" = NULL,
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE state."projectId" = NEW."projectId"
      AND state."deletedAt" IS NULL
      AND state."resourceId" IN (
        SELECT resource_id
        FROM changed_resources
        WHERE resource_id IS NOT NULL
      );
  END IF;
  RETURN NULL;
END;
$$;

DROP FUNCTION claim_asset_resource_index_garbage(TIMESTAMPTZ, INTEGER);

CREATE FUNCTION claim_asset_resource_index_garbage(
  p_project_id TEXT,
  p_resource_ids TEXT[],
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
  IF p_project_id IS NULL
    OR BTRIM(p_project_id) = ''
    OR COALESCE(array_length(p_resource_ids, 1), 0) = 0
    OR EXISTS (
      SELECT 1 FROM unnest(p_resource_ids) AS resource_id
      WHERE resource_id IS NULL OR BTRIM(resource_id) = ''
    )
  THEN
    RAISE EXCEPTION 'Resource index garbage collection scope is invalid';
  END IF;
  RETURN QUERY
  WITH candidates AS (
    SELECT candidate.ctid
    FROM public."AssetResourceIndexRevision" AS candidate
    WHERE candidate."projectId" = p_project_id
      AND candidate."resourceId" = ANY(p_resource_ids)
      AND candidate."unreferencedAt" <= p_before
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

CREATE OR REPLACE FUNCTION finalize_asset_resource_index_garbage(
  p_project_id TEXT,
  p_resource_id TEXT,
  p_revision TEXT,
  p_gc_claim_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  removed BOOLEAN;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      pg_catalog.jsonb_build_array(p_project_id, p_resource_id)::TEXT,
      0
    )
  );

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
  removed := FOUND;

  IF removed THEN
    DELETE FROM public."AssetResourceIndexState" AS state
    WHERE state."projectId" = p_project_id
      AND state."resourceId" = p_resource_id
      AND state."deletedAt" IS NOT NULL
      AND state."activeRevision" IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public."AssetResourceIndexRevision" AS revision
        WHERE revision."projectId" = state."projectId"
          AND revision."resourceId" = state."resourceId"
      );
  END IF;

  RETURN removed;
END;
$$;

COMMIT;
