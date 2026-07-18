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
