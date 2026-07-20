BEGIN;
SET LOCAL search_path = pgtap, public;
SELECT no_plan();

INSERT INTO "Project" ("id", "title", "tags", "domain")
VALUES ('resource-index-test-project', 'Resource index test', '{}', 'resource-index-test.example');

SELECT lives_ok(
  $$
    SELECT begin_asset_resource_index_build(
      'resource-index-test-project',
      'posts',
      '*[]',
      'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
    )
  $$,
  'A valid query and asset revision begin an index build'
);

SELECT is(
  activate_asset_resource_index(
    'resource-index-test-project',
    'posts',
    'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    'projects/test/resources/posts/index.json'
  ),
  TRUE,
  'A validated revision is recorded and activated atomically'
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

SELECT begin_asset_resource_index_build(
  'resource-index-test-project',
  'posts',
  '*[]',
  'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
  'sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
);

SELECT is(
  fail_asset_resource_index_build(
    'resource-index-test-project',
    'posts',
    'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
    'sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
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
    FROM claim_asset_resource_index_garbage('2100-01-01', 10)
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

CREATE TEMP TABLE claimed_resource_index_garbage AS
SELECT * FROM claim_asset_resource_index_garbage('2100-01-01', 10);

SELECT is(
  (SELECT count(*)::INTEGER FROM claimed_resource_index_garbage),
  1,
  'The revision becomes collectable after its last reference is removed'
);

SELECT is(
  (
    SELECT count(*)::INTEGER
    FROM claim_asset_resource_index_garbage('2100-01-01', 10)
  ),
  0,
  'A fresh garbage claim cannot be claimed by another worker'
);

UPDATE "AssetResourceIndexRevision"
SET "gcStartedAt" = CURRENT_TIMESTAMP - INTERVAL '16 minutes'
WHERE "projectId" = 'resource-index-test-project'
  AND "resourceId" = 'posts';

CREATE TEMP TABLE reclaimed_resource_index_garbage AS
SELECT * FROM claim_asset_resource_index_garbage('2100-01-01', 10);

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

DELETE FROM "Project" WHERE "id" = 'resource-index-test-project';

SELECT is(
  (
    SELECT count(*)::INTEGER
    FROM "AssetResourceIndexRevision"
    WHERE "projectId" = 'resource-index-test-project'
  ),
  0,
  'Deleting a project cascades its resource index revisions'
);

SELECT * FROM finish();
ROLLBACK;
