-- Enforce role -> permission mapping on the SQL level.

-- The role/permission mapping used to live in TS (applyTokenPermissions),
-- which risked diverging from the intended SQL behavior. This migration moves
-- it into a BEFORE trigger so writes are always normalized, plus a backfill
-- for pre-existing rows.

-- Truth table (fixed fields per relation; fields not listed are user-tunable
-- and left untouched). This is the single source of truth — the pgTAP tests
-- reference it:
--
--   relation        | canClone | canCopy | canPublish
--   viewers         |   --     |   --    | false
--   editors         |   false  |  true   |   --
--   builders        |   true   |  true   | false
--   administrators  |   true   |  true   | true
--
-- canUseApi is always user-controlled and never touched by the trigger.
--
-- CONVENTION: if a new value is ever added to the AuthorizationRelation enum,
-- this trigger function MUST be extended to handle it. The ELSE branch fails
-- loudly on any unhandled relation so a new role cannot silently bypass
-- permission normalization.

CREATE OR REPLACE FUNCTION enforce_authorization_token_role_permissions()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Preserve user-tunable fields by only setting the fixed ones per role.
  IF NEW."relation" = 'viewers' THEN
    NEW."canPublish" := FALSE;
  ELSIF NEW."relation" = 'editors' THEN
    NEW."canClone" := FALSE;
    NEW."canCopy" := TRUE;
  ELSIF NEW."relation" = 'builders' THEN
    NEW."canClone" := TRUE;
    NEW."canCopy" := TRUE;
    NEW."canPublish" := FALSE;
  ELSIF NEW."relation" = 'administrators' THEN
    NEW."canClone" := TRUE;
    NEW."canCopy" := TRUE;
    NEW."canPublish" := TRUE;
  ELSE
    RAISE EXCEPTION 'Unhandled AuthorizationToken relation: %', NEW."relation";
  END IF;
  RETURN NEW;
END;
$$;

-- Keep this migration re-runnable: drop any pre-existing trigger before
-- creating it. The migration runner does not wrap custom SQL here, so a
-- mid-file failure (e.g. a lock timeout in the backfill below) could leave
-- the function and trigger in place while the migration is marked failed.
DROP TRIGGER IF EXISTS role_permissions_trigger ON "AuthorizationToken";

CREATE TRIGGER role_permissions_trigger
BEFORE INSERT OR UPDATE ON "AuthorizationToken"
FOR EACH ROW
EXECUTE FUNCTION enforce_authorization_token_role_permissions();

-- Backfill pre-existing rows that diverge from the enforced mapping.
--
-- The WHERE clause restricts the UPDATE to rows that do not yet conform, so we
-- never rewrite a new tuple into the heap for already-correct rows. The SET
-- body is a no-op assignment that only serves to fire the BEFORE UPDATE
-- trigger, which performs the actual normalization. This keeps the truth table
-- in exactly one place (the trigger function above) instead of duplicating the
-- CASE logic here.
UPDATE "AuthorizationToken"
SET "canUseApi" = "canUseApi"
WHERE
  ("relation" = 'viewers' AND "canPublish" = TRUE)
  OR ("relation" = 'editors' AND ("canClone" = TRUE OR "canCopy" = FALSE))
  OR ("relation" = 'builders' AND ("canClone" = FALSE OR "canCopy" = FALSE OR "canPublish" = TRUE))
  OR ("relation" = 'administrators' AND ("canClone" = FALSE OR "canCopy" = FALSE OR "canPublish" = FALSE));