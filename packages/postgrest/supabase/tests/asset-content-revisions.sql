BEGIN;
SET LOCAL search_path = pgtap, public;
SELECT no_plan();

INSERT INTO "User" ("id", "email", "username")
VALUES ('revision-user', 'revision-user@example.com', 'revision-user');

INSERT INTO "Project" ("id", "title", "domain", "userId")
VALUES (
  'revision-project',
  'Revision project',
  'revision-project-domain',
  'revision-user'
);

INSERT INTO "File" (
  "name",
  "format",
  "size",
  "status",
  "isDeleted",
  "uploaderProjectId"
)
VALUES
  ('settings_old.json', 'json', 2, 'UPLOADED', false, 'revision-project'),
  ('settings_new.json', 'json', 7, 'UPLOADED', true, 'revision-project'),
  ('settings_other.json', 'json', 7, 'UPLOADED', false, NULL);

INSERT INTO "Asset" ("id", "projectId", "name")
VALUES ('revision-asset', 'revision-project', 'settings_old.json');

SELECT is(
  swap_asset_file(
    'revision-project',
    'revision-asset',
    'settings_old.json',
    'settings_new.json'
  ),
  'updated',
  'swaps an asset to the uploaded revision'
);

SELECT is(
  (
    SELECT "name" FROM "Asset"
    WHERE "id" = 'revision-asset' AND "projectId" = 'revision-project'
  ),
  'settings_new.json',
  'preserves the asset id while changing its file'
);

SELECT ok(
  (SELECT "isDeleted" FROM "File" WHERE "name" = 'settings_old.json'),
  'marks the unreferenced old file as deleted'
);

SELECT isnt(
  (SELECT "isDeleted" FROM "File" WHERE "name" = 'settings_new.json'),
  true,
  'restores the replacement file before using it'
);

SELECT is(
  swap_asset_file(
    'revision-project',
    'revision-asset',
    'settings_old.json',
    'settings_new.json'
  ),
  'conflict',
  'rejects a stale expected file name'
);

SELECT is(
  swap_asset_file(
    'revision-project',
    'revision-asset',
    'settings_new.json',
    'settings_other.json'
  ),
  'invalid_revision',
  'rejects a replacement file that does not belong to the project'
);

SELECT is(
  swap_asset_file(
    'revision-project',
    'revision-asset',
    'settings_new.json',
    'settings_old.json'
  ),
  'updated',
  'can restore the previous revision for undo'
);

SELECT is(
  (
    SELECT "name" FROM "Asset"
    WHERE "id" = 'revision-asset' AND "projectId" = 'revision-project'
  ),
  'settings_old.json',
  'undo keeps the same logical asset id'
);

SELECT * FROM finish();
ROLLBACK;
