BEGIN;

SET
    LOCAL search_path = pgtap,
    public;

-- Initialize the testing environment without planning any specific number of tests
SELECT
    no_plan();

-- Insert a user and a project to satisfy the AuthorizationToken projectId FK
INSERT INTO
    "public"."User" ("id", "createdAt", "email", "username")
VALUES
    (
        'token-user-1',
        '2023-01-01 00:00:00+00',
        'token-user-1@517cce32-9af3-example.com',
        'token-user-1'
    );

INSERT INTO
    "public"."Project" (
        "id",
        "title",
        "domain",
        "userId",
        "isDeleted",
        "createdAt"
    )
VALUES
    (
        'token-project-1',
        'Token Project',
        '517cce32-9af3-token-project-domain',
        'token-user-1',
        false,
        '2023-01-01 00:00:00+00'
    );

-- These tests verify the role -> permission truth table enforced by the
-- role_permissions_trigger. The table itself lives in migration
-- 20260807000000_authorization_token_role_permissions and is the single
-- source of truth: assert against that table rather than restating it here.

-------------------------------------------------------------------------------
-- Test Case 1: Insert normalization per relation
-------------------------------------------------------------------------------
-- Deliberately insert wrong values; the trigger must correct the fixed fields.
INSERT INTO
    "public"."AuthorizationToken" (
        "token",
        "projectId",
        "name",
        "relation",
        "canClone",
        "canCopy",
        "canPublish",
        "canUseApi"
    )
VALUES
    (
        'viewer-token-1',
        'token-project-1',
        'Viewer Token',
        'viewers',
        FALSE,
        FALSE,
        TRUE,
        FALSE
    ),
    (
        'editor-token-1',
        'token-project-1',
        'Editor Token',
        'editors',
        TRUE,
        FALSE,
        FALSE,
        FALSE
    ),
    (
        'builder-token-1',
        'token-project-1',
        'Builder Token',
        'builders',
        FALSE,
        FALSE,
        TRUE,
        FALSE
    ),
    (
        'admin-token-1',
        'token-project-1',
        'Admin Token',
        'administrators',
        FALSE,
        FALSE,
        FALSE,
        FALSE
    );

SELECT
    is(
        (
            SELECT
                "canPublish"
            FROM
                "public"."AuthorizationToken"
            WHERE
                "token" = 'viewer-token-1'
        ),
        FALSE,
        'viewers insert: canPublish forced to false'
    );

SELECT
    is(
        (
            SELECT
                "canClone"
            FROM
                "public"."AuthorizationToken"
            WHERE
                "token" = 'viewer-token-1'
        ),
        FALSE,
        'viewers insert: canClone preserved'
    );

SELECT
    is(
        (
            SELECT
                "canCopy"
            FROM
                "public"."AuthorizationToken"
            WHERE
                "token" = 'viewer-token-1'
        ),
        FALSE,
        'viewers insert: canCopy preserved'
    );

SELECT
    is(
        (
            SELECT
                "canClone"
            FROM
                "public"."AuthorizationToken"
            WHERE
                "token" = 'editor-token-1'
        ),
        FALSE,
        'editors insert: canClone forced to false'
    );

SELECT
    is(
        (
            SELECT
                "canCopy"
            FROM
                "public"."AuthorizationToken"
            WHERE
                "token" = 'editor-token-1'
        ),
        TRUE,
        'editors insert: canCopy forced to true'
    );

SELECT
    is(
        (
            SELECT
                "canPublish"
            FROM
                "public"."AuthorizationToken"
            WHERE
                "token" = 'editor-token-1'
        ),
        FALSE,
        'editors insert: canPublish preserved'
    );

SELECT
    is(
        (
            SELECT
                "canClone"
            FROM
                "public"."AuthorizationToken"
            WHERE
                "token" = 'builder-token-1'
        ),
        TRUE,
        'builders insert: canClone forced to true'
    );

SELECT
    is(
        (
            SELECT
                "canCopy"
            FROM
                "public"."AuthorizationToken"
            WHERE
                "token" = 'builder-token-1'
        ),
        TRUE,
        'builders insert: canCopy forced to true'
    );

SELECT
    is(
        (
            SELECT
                "canPublish"
            FROM
                "public"."AuthorizationToken"
            WHERE
                "token" = 'builder-token-1'
        ),
        FALSE,
        'builders insert: canPublish forced to false'
    );

SELECT
    is(
        (
            SELECT
                "canClone"
            FROM
                "public"."AuthorizationToken"
            WHERE
                "token" = 'admin-token-1'
        ),
        TRUE,
        'administrators insert: canClone forced to true'
    );

SELECT
    is(
        (
            SELECT
                "canCopy"
            FROM
                "public"."AuthorizationToken"
            WHERE
                "token" = 'admin-token-1'
        ),
        TRUE,
        'administrators insert: canCopy forced to true'
    );

SELECT
    is(
        (
            SELECT
                "canPublish"
            FROM
                "public"."AuthorizationToken"
            WHERE
                "token" = 'admin-token-1'
        ),
        TRUE,
        'administrators insert: canPublish forced to true'
    );

-------------------------------------------------------------------------------
-- Test Case 2: Tunable fields preserved on UPDATE
-------------------------------------------------------------------------------
-- Editors can toggle canPublish; the trigger must not reset it.
UPDATE
    "public"."AuthorizationToken"
SET
    "canPublish" = TRUE
WHERE
    "token" = 'editor-token-1';

SELECT
    is(
        (
            SELECT
                "canPublish"
            FROM
                "public"."AuthorizationToken"
            WHERE
                "token" = 'editor-token-1'
        ),
        TRUE,
        'editors update: tunable canPublish preserved'
    );

-- Viewers can toggle canClone/canCopy; the trigger must not reset them.
UPDATE
    "public"."AuthorizationToken"
SET
    "canClone" = TRUE,
    "canCopy" = TRUE
WHERE
    "token" = 'viewer-token-1';

SELECT
    is(
        (
            SELECT
                "canClone"
            FROM
                "public"."AuthorizationToken"
            WHERE
                "token" = 'viewer-token-1'
        ),
        TRUE,
        'viewers update: tunable canClone preserved'
    );

SELECT
    is(
        (
            SELECT
                "canCopy"
            FROM
                "public"."AuthorizationToken"
            WHERE
                "token" = 'viewer-token-1'
        ),
        TRUE,
        'viewers update: tunable canCopy preserved'
    );

-- canUseApi is never touched by the trigger.
UPDATE
    "public"."AuthorizationToken"
SET
    "canUseApi" = TRUE
WHERE
    "token" = 'builder-token-1';

SELECT
    is(
        (
            SELECT
                "canUseApi"
            FROM
                "public"."AuthorizationToken"
            WHERE
                "token" = 'builder-token-1'
        ),
        TRUE,
        'canUseApi preserved on update'
    );

-------------------------------------------------------------------------------
-- Test Case 3: Role change re-normalizes fixed permissions on UPDATE
-------------------------------------------------------------------------------
-- builders -> editors: canClone must drop to false, canCopy stays true,
-- canPublish is now tunable and preserved at its current value (false).
UPDATE
    "public"."AuthorizationToken"
SET
    "relation" = 'editors'
WHERE
    "token" = 'builder-token-1';

SELECT
    is(
        (
            SELECT
                "canClone"
            FROM
                "public"."AuthorizationToken"
            WHERE
                "token" = 'builder-token-1'
        ),
        FALSE,
        'role change -> editors: canClone re-normalized to false'
    );

SELECT
    is(
        (
            SELECT
                "canPublish"
            FROM
                "public"."AuthorizationToken"
            WHERE
                "token" = 'builder-token-1'
        ),
        FALSE,
        'role change -> editors: canPublish becomes tunable and stays false'
    );

-- editors -> administrators: all fixed permissions become true.
UPDATE
    "public"."AuthorizationToken"
SET
    "relation" = 'administrators'
WHERE
    "token" = 'builder-token-1';

SELECT
    is(
        (
            SELECT
                "canPublish"
            FROM
                "public"."AuthorizationToken"
            WHERE
                "token" = 'builder-token-1'
        ),
        TRUE,
        'role change -> administrators: canPublish re-normalized to true'
    );

SELECT
    is(
        (
            SELECT
                "canUseApi"
            FROM
                "public"."AuthorizationToken"
            WHERE
                "token" = 'builder-token-1'
        ),
        TRUE,
        'role change: canUseApi untouched'
    );

-------------------------------------------------------------------------------
-- Test Case 4: Backfill normalizes pre-existing divergent rows
-------------------------------------------------------------------------------
-- Simulate rows that predate the trigger: disable it, insert divergent
-- values, re-enable. These must be fixed by the migration backfill, whose
-- divergence WHERE-clause and trigger-driven SET body match migration
-- 20260807000000_authorization_token_role_permissions.
ALTER TABLE
    "public"."AuthorizationToken" DISABLE TRIGGER role_permissions_trigger;

INSERT INTO
    "public"."AuthorizationToken" (
        "token",
        "projectId",
        "name",
        "relation",
        "canClone",
        "canCopy",
        "canPublish",
        "canUseApi"
    )
VALUES
    (
        'legacy-viewer-token',
        'token-project-1',
        'Legacy Viewer',
        'viewers',
        FALSE,
        FALSE,
        TRUE,
        FALSE
    ),
    (
        'legacy-editor-token',
        'token-project-1',
        'Legacy Editor',
        'editors',
        TRUE,
        FALSE,
        TRUE,
        FALSE
    );

ALTER TABLE
    "public"."AuthorizationToken" ENABLE TRIGGER role_permissions_trigger;

-- Confirm the legacy rows are still divergent at this point.
SELECT
    is(
        (
            SELECT
                "canPublish"
            FROM
                "public"."AuthorizationToken"
            WHERE
                "token" = 'legacy-viewer-token'
        ),
        TRUE,
        'legacy rows stay divergent while the trigger is disabled'
    );

-- Apply the same backfill UPDATE used in migration 20260807000000.
UPDATE
    "public"."AuthorizationToken"
SET
    "canUseApi" = "canUseApi"
WHERE
    (
        "relation" = 'viewers'
        AND "canPublish" = TRUE
    )
    OR (
        "relation" = 'editors'
        AND ("canClone" = TRUE OR "canCopy" = FALSE)
    )
    OR (
        "relation" = 'builders'
        AND (
            "canClone" = FALSE
            OR "canCopy" = FALSE
            OR "canPublish" = TRUE
        )
    )
    OR (
        "relation" = 'administrators'
        AND (
            "canClone" = FALSE
            OR "canCopy" = FALSE
            OR "canPublish" = FALSE
        )
    );

SELECT
    is(
        (
            SELECT
                "canPublish"
            FROM
                "public"."AuthorizationToken"
            WHERE
                "token" = 'legacy-viewer-token'
        ),
        FALSE,
        'backfill: legacy viewers canPublish normalized to false'
    );

SELECT
    is(
        (
            SELECT
                "canClone"
            FROM
                "public"."AuthorizationToken"
            WHERE
                "token" = 'legacy-editor-token'
        ),
        FALSE,
        'backfill: legacy editors canClone normalized to false'
    );

SELECT
    is(
        (
            SELECT
                "canCopy"
            FROM
                "public"."AuthorizationToken"
            WHERE
                "token" = 'legacy-editor-token'
        ),
        TRUE,
        'backfill: legacy editors canCopy normalized to true'
    );

-- canUseApi is never part of the divergence logic, so the backfill preserves it.
SELECT
    is(
        (
            SELECT
                "canUseApi"
            FROM
                "public"."AuthorizationToken"
            WHERE
                "token" = 'legacy-editor-token'
        ),
        FALSE,
        'backfill: canUseApi preserved'
    );

-- Already-conforming rows are excluded by the backfill predicate.
SELECT
    is(
        (
            SELECT
                "canPublish"
            FROM
                "public"."AuthorizationToken"
            WHERE
                "token" = 'admin-token-1'
        ),
        TRUE,
        'backfill: already-conforming administrator row left in place'
    );

-- Finalize the tests
SELECT
    finish();

ROLLBACK;