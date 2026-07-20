ALTER TABLE "File"
ADD COLUMN "contentHash" VARCHAR(64);

CREATE UNIQUE INDEX "File_uploaderProjectId_contentHash_key"
ON "File"("uploaderProjectId", "contentHash")
WHERE "contentHash" IS NOT NULL;
