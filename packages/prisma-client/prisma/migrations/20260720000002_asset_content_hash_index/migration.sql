CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "File_uploaderProjectId_contentHash_key"
ON "File"("uploaderProjectId", "contentHash")
WHERE "contentHash" IS NOT NULL;
