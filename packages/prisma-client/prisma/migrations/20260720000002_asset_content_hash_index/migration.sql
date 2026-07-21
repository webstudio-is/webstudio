CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "File_uploaderProjectId_contentHash_extension_key"
ON "File"(
  "uploaderProjectId",
  "contentHash",
  (
    CASE
      WHEN strpos(reverse("name"), '.') IN (0, 1)
        OR length("name") - strpos(reverse("name"), '.') + 1 = 1
      THEN ''
      ELSE lower(reverse(split_part(reverse("name"), '.', 1)))
    END
  )
)
WHERE "contentHash" IS NOT NULL;
