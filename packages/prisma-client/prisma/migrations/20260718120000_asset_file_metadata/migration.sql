CREATE TABLE "AssetFileMetadata" (
  "projectId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "revision" TEXT NOT NULL,
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
