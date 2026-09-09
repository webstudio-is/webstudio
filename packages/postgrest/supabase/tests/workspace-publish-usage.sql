BEGIN;
SET LOCAL search_path = pgtap, public;
SELECT no_plan();

INSERT INTO "User" (id, email, username) VALUES ('publish-user', 'publish@example.com', 'publish-user');
INSERT INTO "Workspace" (id, name, "userId") VALUES
  ('11111111-1111-1111-1111-111111111111', 'Source', 'publish-user'),
  ('22222222-2222-2222-2222-222222222222', 'Destination', 'publish-user');
INSERT INTO "Project" (id, title, domain, "userId", "workspaceId") VALUES
  ('publish-a', 'A', 'publish-a', 'publish-user', '11111111-1111-1111-1111-111111111111'),
  ('publish-b', 'B', 'publish-b', 'publish-user', '11111111-1111-1111-1111-111111111111'),
  ('publish-empty', 'Empty', 'publish-empty', 'publish-user', NULL),
  ('publish-legacy', 'Legacy', 'publish-legacy', 'publish-user', NULL);
INSERT INTO "Build" (id, "projectId", pages) VALUES
  ('dev-a', 'publish-a', '{}'), ('dev-b', 'publish-b', '{}'), ('dev-legacy', 'publish-legacy', '{}');

SELECT is(get_workspace_publish_usage('publish-a'), 0, 'new workspace starts at zero');
SELECT ok(create_production_build('publish-a', '{}', 2, 'publish-user') IS NOT NULL, 'first publish creates a build');
SELECT is(get_workspace_publish_usage('publish-b'), 1, 'all projects share the counter');
SELECT ok(create_production_build('publish-b', '{}', 2, 'publish-user') IS NOT NULL, 'last allowed publish succeeds');
SELECT throws_ok($$SELECT create_production_build('publish-a', '{}', 2, 'publish-user')$$,
  'PT429', 'This workspace has reached its daily publishing limit of 2. The limit resets at midnight UTC.', 'next publish is rejected');
SELECT is((SELECT count(*)::integer FROM "Build" WHERE deployment IS NOT NULL), 2, 'rejection creates no build');
SELECT is(get_workspace_publish_usage('publish-a'), 2, 'rejection does not change usage');

DELETE FROM "Build" WHERE "projectId" = 'publish-a' AND deployment IS NOT NULL;
SELECT is(get_workspace_publish_usage('publish-a'), 2, 'unpublishing does not refund usage');
UPDATE "Project" SET "workspaceId" = '22222222-2222-2222-2222-222222222222' WHERE id = 'publish-a';
SELECT is(get_workspace_publish_usage('publish-b'), 2, 'moving a project does not refund its source');
SELECT is(get_workspace_publish_usage('publish-a'), 0, 'moving a project does not charge its destination');
SELECT ok(create_production_build('publish-a', '{}', 1, 'publish-user') IS NOT NULL, 'new publish uses destination allowance');

SELECT throws_ok($$SELECT create_production_build('publish-empty', '{}', 10, 'publish-user')$$,
  'P0001', 'Development build not found', 'missing development build fails');
SELECT is(get_workspace_publish_usage('publish-empty'), 0, 'failed build creation rolls back the charge');
SELECT throws_ok($$SELECT create_production_build('publish-legacy', '{}', 10, 'previous-owner')$$,
  'P0001', 'Project ownership changed. Try publishing again.', 'stale owner allowance is rejected');
SELECT is(get_workspace_publish_usage('publish-legacy'), 0, 'owner mismatch does not charge usage');
SELECT ok(create_production_build('publish-legacy', '{}') IS NOT NULL, 'older application signature remains callable');
SELECT is(get_workspace_publish_usage('publish-empty'), 1, 'legacy projects share durable owner usage');

INSERT INTO "WorkspacePublishUsage" ("scopeId", day, used) VALUES
  ('workspace:11111111-1111-1111-1111-111111111111', (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - 1, 999);
-- Pick a session timezone whose calendar date differs from UTC at test time.
SELECT set_config('TimeZone', CASE
  WHEN EXTRACT(HOUR FROM CURRENT_TIMESTAMP AT TIME ZONE 'UTC') >= 10 THEN 'Pacific/Kiritimati'
  ELSE 'Etc/GMT+12'
END, true);
SELECT is(get_workspace_publish_usage('publish-b'), 2, 'old days and session timezone do not affect UTC usage');
SELECT * FROM finish();
ROLLBACK;
