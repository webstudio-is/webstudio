BEGIN;
SET LOCAL search_path = pgtap, public;
SELECT no_plan();

INSERT INTO "Project" ("id", "title", "tags", "domain")
VALUES ('resource-index-test-project', 'Resource index test', '{}', 'resource-index-test.example');

INSERT INTO "Build" ("id", "projectId", pages, resources)
VALUES ('resource-index-test-build', 'resource-index-test-project', '[]', '[]');

SELECT lives_ok(
  $$
    SELECT begin_asset_resource_index_build(
      'resource-index-test-project',
      'posts',
      '*[]',
      'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      'attempt-active',
      '[]'::JSONB,
      NULL,
      NULL,
      'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
      'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
      'projects/test/resources/posts/index.json'
    )
  $$,
  'A valid build pre-registers its immutable revision before storage writes'
);

SELECT is(
  (
    SELECT count(*)::INTEGER
    FROM "AssetResourceIndexRevision"
    WHERE "projectId" = 'resource-index-test-project'
      AND "resourceId" = 'posts'
      AND revision = 'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'
  ),
  1,
  'A crash after storage persistence leaves a revision discoverable by GC'
);

SELECT is(
  activate_asset_resource_index(
    'resource-index-test-project',
    'posts',
    'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    'attempt-active',
    'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    'projects/test/resources/posts/index.json'
  ),
  TRUE,
  'A validated revision is recorded and activated atomically'
);

UPDATE "Build"
SET resources = '[{"id":"newer-resource-snapshot"}]'
WHERE id = 'resource-index-test-build'
  AND "projectId" = 'resource-index-test-project';

SELECT is(
  (
    SELECT "buildStatus"
    FROM "AssetResourceIndexState"
    WHERE "projectId" = 'resource-index-test-project'
      AND "resourceId" = 'posts'
  ),
  'STALE'::"AssetResourceIndexBuildStatus",
  'A saved resource change invalidates active indexes synchronously'
);

SELECT is(
  begin_asset_resource_index_build(
    'resource-index-test-project',
    'posts',
    '*[false]',
    'sha256:1111111111111111111111111111111111111111111111111111111111111111',
    'sha256:2222222222222222222222222222222222222222222222222222222222222222',
    'attempt-stale-resources',
    '[]'::JSONB,
    'resource-index-test-build',
    '[]'
  ),
  FALSE,
  'A build from a stale resource snapshot cannot replace current state'
);

SELECT is(
  begin_asset_resource_index_build(
    'resource-index-test-project',
    'posts',
    '*[false]',
    'sha256:1111111111111111111111111111111111111111111111111111111111111111',
    'sha256:2222222222222222222222222222222222222222222222222222222222222222',
    'attempt-stale-metadata',
    '[{"assetId":"missing","metadataToken":"old"}]'::JSONB,
    'resource-index-test-build',
    '[{"id":"newer-resource-snapshot"}]'
  ),
  FALSE,
  'A build from a stale metadata snapshot cannot replace current state'
);

UPDATE "Build"
SET resources = '[]'
WHERE id = 'resource-index-test-build'
  AND "projectId" = 'resource-index-test-project';

SELECT begin_asset_resource_index_build(
  'resource-index-test-project',
  'posts',
  '*[]',
  'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  'attempt-reactivated',
  '[]'::JSONB,
  'resource-index-test-build',
  '[]'
);

SELECT is(
  activate_asset_resource_index(
    'resource-index-test-project',
    'posts',
    'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    'attempt-reactivated',
    'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    'projects/test/resources/posts/index.json',
    '[]'::JSONB,
    'resource-index-test-build',
    '[]'
  ),
  TRUE,
  'The current resource snapshot can reactivate its matching revision'
);

SELECT is(
  (
    SELECT revision."checksum"
    FROM "AssetResourceIndexState" AS state
    INNER JOIN "AssetResourceIndexRevision" AS revision
      ON revision."projectId" = state."projectId"
      AND revision."resourceId" = state."resourceId"
      AND revision."revision" = state."activeRevision"
    WHERE state."projectId" = 'resource-index-test-project'
      AND state."resourceId" = 'posts'
      AND state."buildStatus" = 'ACTIVE'
  ),
  'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
  'Project data resolves an active revision to its checksum and object reference'
);

INSERT INTO "File" (name, format, size, status)
VALUES ('resource-index-test.md', 'file', 10, 'UPLOADED');

INSERT INTO "Asset" (id, "projectId", name)
VALUES ('resource-index-test-asset', 'resource-index-test-project', 'resource-index-test.md');

SELECT throws_ok(
  $$
    INSERT INTO "AssetFileMetadata" (
      "projectId", "assetId", revision, document, "fieldContributions"
    ) VALUES (
      'resource-index-test-project',
      'resource-index-test-asset',
      'file:resource-index-test.md:invalid',
      '{}'::JSONB,
      '[]'::JSONB
    )
  $$,
  '23514',
  NULL,
  'Canonical metadata requires explicit matching identity fields'
);

INSERT INTO "AssetFileMetadata" (
  "projectId", "assetId", revision, document, "fieldContributions"
) VALUES (
  'resource-index-test-project',
  'resource-index-test-asset',
  'file:resource-index-test.md:1',
  '{"_id":"resource-index-test-asset","revision":"file:resource-index-test.md:1"}'::JSONB,
  '[]'::JSONB
);

SELECT is(
  (
    SELECT "buildStatus"
    FROM "AssetResourceIndexState"
    WHERE "projectId" = 'resource-index-test-project'
      AND "resourceId" = 'posts'
  ),
  'STALE'::"AssetResourceIndexBuildStatus",
  'A canonical metadata change invalidates an active index synchronously'
);

DELETE FROM "AssetFileMetadata"
WHERE "projectId" = 'resource-index-test-project'
  AND "assetId" = 'resource-index-test-asset';

SELECT begin_asset_resource_index_build(
  'resource-index-test-project',
  'posts',
  '*[]',
  'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
  'sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  'attempt-old',
  '[]'::JSONB,
  'resource-index-test-build',
  '[]'
);

SELECT begin_asset_resource_index_build(
  'resource-index-test-project',
  'posts',
  '*[]',
  'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
  'sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  'attempt-current',
  '[]'::JSONB,
  'resource-index-test-build',
  '[]'
);

SELECT is(
  activate_asset_resource_index(
    'resource-index-test-project',
    'posts',
    'sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
    'sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    'attempt-old',
    'sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    'projects/test/resources/posts/superseded.json'
  ),
  FALSE,
  'A superseded attempt cannot activate its persisted revision'
);

SELECT ok(
  (
    SELECT "unreferencedAt" IS NOT NULL
    FROM "AssetResourceIndexRevision"
    WHERE "projectId" = 'resource-index-test-project'
      AND "resourceId" = 'posts'
      AND revision = 'sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
  ),
  'A superseded persisted revision remains discoverable for garbage collection'
);

SELECT is(
  fail_asset_resource_index_build(
    'resource-index-test-project',
    'posts',
    'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
    'sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    'attempt-old',
    '{"code":"INDEX_BUILD_FAILED","message":"Old attempt failed"}'::JSONB
  ),
  FALSE,
  'An older identical attempt cannot fail the current build'
);

SELECT is(
  fail_asset_resource_index_build(
    'resource-index-test-project',
    'posts',
    'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
    'sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    'attempt-current',
    '{"code":"INDEX_BUILD_FAILED","message":"Resource index build failed"}'::JSONB
  ),
  TRUE,
  'The current replacement attempt can be marked failed'
);

SELECT is(
  (
    SELECT "activeRevision"
    FROM "AssetResourceIndexState"
    WHERE "projectId" = 'resource-index-test-project'
      AND "resourceId" = 'posts'
      AND "buildStatus" = 'FAILED'
  ),
  'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
  'A failed replacement preserves the previous active revision'
);

UPDATE "AssetResourceIndexRevision"
SET "unreferencedAt" = CURRENT_TIMESTAMP - INTERVAL '1 minute'
WHERE "projectId" = 'resource-index-test-project'
  AND "resourceId" = 'posts'
  AND revision = 'sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

SELECT is(
  begin_asset_resource_index_build(
    'resource-index-test-project',
    'posts',
    '*[]',
    'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
    'sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    'attempt-reserved-revision',
    '[]'::JSONB,
    'resource-index-test-build',
    '[]',
    'sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    'sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    'projects/test/resources/posts/superseded.json'
  ),
  TRUE,
  'Reusing an immutable revision reserves it before the storage write'
);

SELECT ok(
  (
    SELECT "unreferencedAt" > CURRENT_TIMESTAMP
    FROM "AssetResourceIndexRevision"
    WHERE "projectId" = 'resource-index-test-project'
      AND "resourceId" = 'posts'
      AND revision = 'sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
  ),
  'A reused unreferenced revision receives a fresh garbage-collection grace period'
);

SELECT is(
  (
    SELECT count(*)::INTEGER
    FROM claim_asset_resource_index_garbage(
      'another-project', ARRAY['posts'], '2100-01-01', 10
    )
  ),
  0,
  'Garbage collection cannot claim revisions outside the affected project'
);

SELECT is(
  (
    SELECT count(*)::INTEGER
    FROM claim_asset_resource_index_garbage(
      'resource-index-test-project', ARRAY['posts'], CURRENT_TIMESTAMP, 10
    )
  ),
  0,
  'Garbage collection cannot claim a revision reserved by a current build'
);

CREATE TEMP TABLE superseded_revision_garbage AS
SELECT * FROM claim_asset_resource_index_garbage(
  'resource-index-test-project', ARRAY['posts'], '2100-01-01', 10
);

SELECT is(
  (SELECT count(*)::INTEGER FROM superseded_revision_garbage),
  1,
  'A superseded persisted revision remains collectable after its grace period'
);

SELECT is(
  finalize_asset_resource_index_garbage(
    (SELECT "projectId" FROM superseded_revision_garbage),
    (SELECT "resourceId" FROM superseded_revision_garbage),
    (SELECT revision FROM superseded_revision_garbage),
    (SELECT "gcClaimId" FROM superseded_revision_garbage)
  ),
  TRUE,
  'The superseded persisted revision can be finalized independently'
);

SELECT throws_ok(
  $$
    UPDATE "AssetResourceIndexState"
    SET "activeRevision" = 'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd'
    WHERE "projectId" = 'resource-index-test-project'
      AND "resourceId" = 'posts'
  $$,
  '23503',
  NULL,
  'An active revision must reference a persisted revision for the same resource'
);

SELECT throws_ok(
  $$
    INSERT INTO "AssetResourceIndexRevision" (
      "projectId", "resourceId", "revision", "queryHash",
      "assetRevision", "checksum", "objectKey"
    ) VALUES (
      'resource-index-test-project',
      'posts',
      'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
      'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      'sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      'projects/test/resources/posts/other.json'
    )
  $$,
  '23514',
  NULL,
  'A revision identifier must equal its artifact checksum'
);

SELECT lives_ok(
  $$
    SELECT add_asset_resource_index_reference(
      'resource-index-test-project',
      'posts',
      'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
      'DEPLOYMENT',
      'deployment-1'
    )
  $$,
  'An active deployment can retain the current revision'
);

SELECT lives_ok(
  $$
    SELECT add_asset_resource_index_reference(
      'resource-index-test-project',
      'posts',
      'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
      'DEPLOYMENT',
      'deployment-1'
    )
  $$,
  'Repeated shared-reference creation is idempotent'
);

SELECT is(
  (
    SELECT count(*)::INTEGER
    FROM "AssetResourceIndexReference"
    WHERE "projectId" = 'resource-index-test-project'
      AND "referenceId" = 'deployment-1'
  ),
  1,
  'One owner contributes one durable reference count'
);

SELECT is(
  delete_asset_resource_index_query(
    'resource-index-test-project',
    'posts'
  ),
  TRUE,
  'Deleting a resource query removes its active association'
);

SELECT is(
  (
    SELECT count(*)::INTEGER
    FROM "AssetResourceIndexRevision"
    WHERE "projectId" = 'resource-index-test-project'
      AND "resourceId" = 'posts'
  ),
  1,
  'Query deletion retains immutable revision records for safe cleanup'
);

SELECT is(
  (
    SELECT count(*)::INTEGER
    FROM claim_asset_resource_index_garbage(
      'resource-index-test-project', ARRAY['posts'], '2100-01-01', 10
    )
  ),
  0,
  'A deployment reference prevents deleted-query revision collection'
);

SELECT is(
  remove_asset_resource_index_reference(
    'resource-index-test-project',
    'DEPLOYMENT',
    'deployment-1'
  ),
  1,
  'Removing a deployment releases its revision reference'
);

SELECT lives_ok(
  $$
    SELECT add_asset_resource_index_reference(
      'resource-index-test-project',
      'posts',
      'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
      'BUILD',
      'abandoned-build'
    )
  $$,
  'An in-flight build can temporarily retain a revision'
);

UPDATE "AssetResourceIndexReference"
SET "createdAt" = CURRENT_TIMESTAMP - INTERVAL '25 hours'
WHERE "projectId" = 'resource-index-test-project'
  AND type = 'BUILD'
  AND "referenceId" = 'abandoned-build';

CREATE TEMP TABLE claimed_resource_index_garbage AS
SELECT * FROM claim_asset_resource_index_garbage(
  'resource-index-test-project', ARRAY['posts'], '2100-01-01', 10
);

SELECT is(
  (SELECT count(*)::INTEGER FROM claimed_resource_index_garbage),
  1,
  'An expired transient build reference does not retain a revision forever'
);

SELECT is(
  (
    SELECT count(*)::INTEGER
    FROM claim_asset_resource_index_garbage(
      'resource-index-test-project', ARRAY['posts'], '2100-01-01', 10
    )
  ),
  0,
  'A fresh garbage claim cannot be claimed by another worker'
);

UPDATE "AssetResourceIndexRevision"
SET "gcStartedAt" = CURRENT_TIMESTAMP - INTERVAL '16 minutes'
WHERE "projectId" = 'resource-index-test-project'
  AND "resourceId" = 'posts';

CREATE TEMP TABLE reclaimed_resource_index_garbage AS
SELECT * FROM claim_asset_resource_index_garbage(
  'resource-index-test-project', ARRAY['posts'], '2100-01-01', 10
);

SELECT is(
  (SELECT count(*)::INTEGER FROM reclaimed_resource_index_garbage),
  1,
  'An expired garbage claim is reclaimed after its lease'
);

SELECT isnt(
  (SELECT "gcClaimId" FROM reclaimed_resource_index_garbage),
  (SELECT "gcClaimId" FROM claimed_resource_index_garbage),
  'Reclaiming an expired garbage claim rotates its claim id'
);

SELECT is(
  finalize_asset_resource_index_garbage(
    (SELECT "projectId" FROM claimed_resource_index_garbage),
    (SELECT "resourceId" FROM claimed_resource_index_garbage),
    (SELECT revision FROM claimed_resource_index_garbage),
    (SELECT "gcClaimId" FROM claimed_resource_index_garbage)
  ),
  FALSE,
  'An expired claim cannot finalize after another worker reclaims it'
);

SELECT is(
  finalize_asset_resource_index_garbage(
    (SELECT "projectId" FROM reclaimed_resource_index_garbage),
    (SELECT "resourceId" FROM reclaimed_resource_index_garbage),
    (SELECT revision FROM reclaimed_resource_index_garbage),
    (SELECT "gcClaimId" FROM reclaimed_resource_index_garbage)
  ),
  TRUE,
  'The matching garbage claim finalizes revision cleanup'
);

SELECT is(
  finalize_asset_resource_index_garbage(
    (SELECT "projectId" FROM reclaimed_resource_index_garbage),
    (SELECT "resourceId" FROM reclaimed_resource_index_garbage),
    (SELECT revision FROM reclaimed_resource_index_garbage),
    (SELECT "gcClaimId" FROM reclaimed_resource_index_garbage)
  ),
  FALSE,
  'Repeated cleanup is idempotent'
);

SELECT is(
  delete_asset_resource_index_query(
    'resource-index-test-project',
    'posts'
  ),
  FALSE,
  'Repeated query deletion is idempotent'
);

INSERT INTO "AssetResourceIndexState" (
  "projectId", "resourceId", query, "queryHash", "assetRevision",
  "buildAttemptId", "buildStatus"
) VALUES (
  'resource-index-test-project',
  'project-delete-test',
  '*[]',
  'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  'project-delete-attempt',
  'BUILDING'
);

INSERT INTO "AssetResourceIndexRevision" (
  "projectId", "resourceId", revision, "queryHash", "assetRevision",
  checksum, "objectKey"
) VALUES (
  'resource-index-test-project',
  'project-delete-test',
  'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
  'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
  'projects/test/resources/project-delete-test.json'
);

UPDATE "AssetResourceIndexState"
SET "activeRevision" =
      'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
  "buildStatus" = 'ACTIVE'
WHERE "projectId" = 'resource-index-test-project'
  AND "resourceId" = 'project-delete-test';

UPDATE "Project"
SET "isDeleted" = TRUE
WHERE id = 'resource-index-test-project';

SELECT ok(
  (
    SELECT "activeRevision" IS NULL AND "deletedAt" IS NOT NULL
    FROM "AssetResourceIndexState"
    WHERE "projectId" = 'resource-index-test-project'
      AND "resourceId" = 'project-delete-test'
  ),
  'Soft project deletion retires active resource indexes'
);

SELECT ok(
  (
    SELECT "unreferencedAt" IS NOT NULL
    FROM "AssetResourceIndexRevision"
    WHERE "projectId" = 'resource-index-test-project'
      AND "resourceId" = 'project-delete-test'
  ),
  'Soft project deletion makes immutable indexes collectible'
);

DELETE FROM "Build"
WHERE "id" = 'resource-index-test-build'
  AND "projectId" = 'resource-index-test-project';

SELECT is(
  (
    SELECT count(*)::INTEGER
    FROM "AssetResourceIndexRevision"
    WHERE "projectId" = 'resource-index-test-project'
  ),
  1,
  'The project still owns an immutable index before hard deletion'
);

DELETE FROM "Project" WHERE "id" = 'resource-index-test-project';

SELECT is(
  (
    SELECT count(*)::INTEGER
    FROM "AssetResourceIndexRevision"
    WHERE "projectId" = 'resource-index-test-project'
  ),
  0,
  'Hard project deletion cascades database state without waiting for object storage'
);

SELECT * FROM finish();
ROLLBACK;
