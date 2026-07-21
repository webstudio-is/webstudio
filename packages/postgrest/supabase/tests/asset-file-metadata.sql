BEGIN;
SET LOCAL search_path = pgtap, public;
SELECT no_plan();

INSERT INTO "File" (
  "name",
  "format",
  "size",
  "updatedAt",
  "status"
)
VALUES (
  'metadata-test.md',
  'md',
  10,
  '2026-07-18T10:00:00Z',
  'UPLOADED'
);

INSERT INTO "Asset" (
  "id",
  "projectId",
  "name",
  "filename"
)
VALUES (
  'metadata-test-asset',
  'metadata-test-project',
  'metadata-test.md',
  'post.md'
);

SELECT is(
  replace_asset_file_metadata(
    'metadata-test-project',
    'metadata-test-asset',
    'revision-1',
    '{"_id":"metadata-test-asset","revision":"revision-1"}'::JSONB,
    '[]'::JSONB,
    '{"storageName":"metadata-test.md","fileUpdatedAt":"2026-07-18T10:00:00Z","fileSize":10,"filename":"post.md","folderId":null}'::JSONB
  ),
  TRUE,
  'A current source snapshot atomically creates canonical metadata'
);

SELECT is(
  (
    SELECT count(*)::INTEGER
    FROM "AssetFileMetadata"
    WHERE "projectId" = 'metadata-test-project'
      AND "assetId" = 'metadata-test-asset'
  ),
  1,
  'One asset has one active canonical revision'
);

CREATE TEMP TABLE initial_metadata_token AS
SELECT "metadataToken"
FROM "AssetFileMetadata"
WHERE "projectId" = 'metadata-test-project'
  AND "assetId" = 'metadata-test-asset';

SELECT is(
  replace_asset_file_metadata(
    'metadata-test-project',
    'metadata-test-asset',
    'revision-1',
    '{"_id":"metadata-test-asset","revision":"revision-1"}'::JSONB,
    '[]'::JSONB,
    '{"storageName":"metadata-test.md","fileUpdatedAt":"2026-07-18T10:00:00Z","fileSize":10,"filename":"post.md","folderId":null}'::JSONB
  ),
  TRUE,
  'Repeated replacement of identical canonical metadata is accepted'
);

SELECT is(
  (
    SELECT "metadataToken"
    FROM "AssetFileMetadata"
    WHERE "projectId" = 'metadata-test-project'
      AND "assetId" = 'metadata-test-asset'
  ),
  (SELECT "metadataToken" FROM initial_metadata_token),
  'Identical canonical metadata preserves its snapshot token'
);

UPDATE "File"
SET "size" = 11,
  "updatedAt" = '2026-07-18T11:00:00Z'
WHERE "name" = 'metadata-test.md';

SELECT is(
  replace_asset_file_metadata(
    'metadata-test-project',
    'metadata-test-asset',
    'stale-revision',
    '{"_id":"stale"}'::JSONB,
    '[]'::JSONB,
    '{"storageName":"metadata-test.md","fileUpdatedAt":"2026-07-18T10:00:00Z","fileSize":10,"filename":"post.md","folderId":null}'::JSONB
  ),
  FALSE,
  'A stale source snapshot cannot replace newer canonical metadata'
);

SELECT is(
  (
    SELECT "revision"
    FROM "AssetFileMetadata"
    WHERE "projectId" = 'metadata-test-project'
      AND "assetId" = 'metadata-test-asset'
  ),
  'revision-1',
  'Rejected stale work leaves the active revision unchanged'
);

SELECT is(
  replace_asset_file_metadata(
    'metadata-test-project',
    'metadata-test-asset',
    'revision-2',
    '{"_id":"metadata-test-asset","revision":"revision-2"}'::JSONB,
    '[]'::JSONB,
    '{"storageName":"metadata-test.md","fileUpdatedAt":"2026-07-18T11:00:00Z","fileSize":11,"filename":"post.md","folderId":null}'::JSONB
  ),
  TRUE,
  'The current source snapshot replaces the prior revision'
);

SELECT results_eq(
  $$
    SELECT "revision"
    FROM "AssetFileMetadata"
    WHERE "projectId" = 'metadata-test-project'
      AND "assetId" = 'metadata-test-asset'
  $$,
  $$ VALUES ('revision-2') $$,
  'Revision replacement removes the superseded row in the same transaction'
);

SELECT is(
  delete_stale_asset_file_metadata(
    'metadata-test-project',
    ARRAY['metadata-test-asset']
  ),
  0,
  'Stale cleanup preserves metadata for a current uploaded Markdown asset'
);

UPDATE "File"
SET "status" = 'UPLOADING'
WHERE "name" = 'metadata-test.md';

SELECT is(
  delete_stale_asset_file_metadata(
    'metadata-test-project',
    ARRAY['metadata-test-asset']
  ),
  1,
  'Stale cleanup removes metadata only after the source is no longer current'
);

SELECT is(
  (
    SELECT count(*)::INTEGER
    FROM "AssetFileMetadata"
    WHERE "projectId" = 'metadata-test-project'
  ),
  0,
  'Stale cleanup removed the canonical row'
);

INSERT INTO "File" ("name", "format", "size", "updatedAt", "status")
VALUES ('metadata-image.png', 'png', 20, '2026-07-18T12:00:00Z', 'UPLOADED');

INSERT INTO "Asset" ("id", "projectId", "name", "filename")
VALUES (
  'metadata-image-asset',
  'metadata-test-project',
  'metadata-image.png',
  'cover.png'
);

SELECT is(
  replace_asset_file_metadata(
    'metadata-test-project',
    'metadata-image-asset',
    'image-revision',
    '{"_id":"metadata-image-asset","revision":"image-revision"}'::JSONB,
    '[]'::JSONB,
    '{"storageName":"metadata-image.png","fileUpdatedAt":"2026-07-18T12:00:00Z","fileSize":20,"filename":"cover.png","folderId":null}'::JSONB
  ),
  TRUE,
  'Canonical metadata supports any uploaded asset type'
);

SELECT is(
  delete_stale_asset_file_metadata(
    'metadata-test-project',
    ARRAY['metadata-image-asset']
  ),
  0,
  'Stale cleanup preserves metadata for an uploaded non-Markdown asset'
);

SELECT is(
  (
    SELECT count(*)::INTEGER
    FROM "AssetFileMetadata"
    WHERE "projectId" = 'metadata-test-project'
      AND "assetId" = 'metadata-image-asset'
  ),
  1,
  'Non-Markdown canonical metadata remains available'
);

SELECT * FROM finish();
ROLLBACK;
