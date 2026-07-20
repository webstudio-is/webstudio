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
