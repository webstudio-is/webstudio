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
      AND candidate."gcClaimId" IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public."AssetResourceIndexReference" AS reference
        WHERE reference."projectId" = candidate."projectId"
          AND reference."resourceId" = candidate."resourceId"
          AND reference.revision = candidate.revision
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
