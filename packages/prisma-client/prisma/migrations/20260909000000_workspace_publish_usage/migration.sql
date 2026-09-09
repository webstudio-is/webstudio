BEGIN;

-- Usage survives unpublishing, project moves, and project deletion.
-- Projects without a workspace share their owner's legacy allowance.
CREATE TABLE "WorkspacePublishUsage" (
  "scopeId" TEXT NOT NULL,
  day DATE NOT NULL,
  used INTEGER NOT NULL CHECK (used >= 0),
  PRIMARY KEY ("scopeId", day)
);

-- Block writes while backfilling usage and replacing the publishing function.
LOCK TABLE "Project" IN SHARE MODE;
LOCK TABLE "Build" IN SHARE ROW EXCLUSIVE MODE;

INSERT INTO "WorkspacePublishUsage" ("scopeId", day, used)
SELECT
  COALESCE('workspace:' || p."workspaceId"::text, 'user:' || p."userId"),
  (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date,
  count(*)::integer
FROM "Build" b JOIN "Project" p ON p.id = b."projectId"
WHERE b.deployment IS NOT NULL
  AND b."createdAt" >= ((CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date AT TIME ZONE 'UTC')
  AND p."userId" IS NOT NULL
GROUP BY 1;

CREATE FUNCTION get_workspace_publish_usage(project_id text) RETURNS integer AS $$
  SELECT COALESCE((
    SELECT u.used FROM "WorkspacePublishUsage" u JOIN "Project" p
      ON u."scopeId" = COALESCE('workspace:' || p."workspaceId"::text, 'user:' || p."userId")
    WHERE p.id = project_id AND u.day = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date
  ), 0);
$$ LANGUAGE sql STABLE;

-- Default arguments keep older application instances working during rollout.
-- They retain their existing application-side check and now record durable usage.
DROP FUNCTION create_production_build(text, text);
CREATE FUNCTION create_production_build(
  project_id text,
  deployment text,
  daily_publish_limit integer DEFAULT NULL,
  expected_owner_id text DEFAULT NULL
) RETURNS text AS $$
DECLARE
  new_build_id text;
  scope_id text;
  owner_id text;
  usage_day date := (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date;
BEGIN
  -- Hold the project in its workspace until both the charge and build commit.
  SELECT COALESCE('workspace:' || p."workspaceId"::text, 'user:' || p."userId"), p."userId"
  INTO scope_id, owner_id FROM "Project" p
  WHERE p.id = project_id AND NOT p."isDeleted"
  FOR SHARE;
  IF scope_id IS NULL THEN
    RAISE EXCEPTION 'Project not found';
  END IF;
  IF expected_owner_id IS NOT NULL AND owner_id IS DISTINCT FROM expected_owner_id THEN
    RAISE EXCEPTION 'Project ownership changed. Try publishing again.';
  END IF;
  IF daily_publish_limit IS NOT NULL AND daily_publish_limit <= 0 THEN
    RAISE EXCEPTION USING ERRCODE = 'PT429', MESSAGE = 'Daily publishing limit reached. The limit resets at midnight UTC.';
  END IF;

  INSERT INTO "WorkspacePublishUsage" ("scopeId", day, used)
  VALUES (scope_id, usage_day, 1)
  ON CONFLICT ("scopeId", day) DO UPDATE SET used = "WorkspacePublishUsage".used + 1
  WHERE daily_publish_limit IS NULL OR "WorkspacePublishUsage".used < daily_publish_limit;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'PT429', MESSAGE = format(
      'This workspace has reached its daily publishing limit of %s. The limit resets at midnight UTC.', daily_publish_limit
    );
  END IF;

  INSERT INTO "Build" (
    version, "lastTransactionId", pages, breakpoints, styles, "styleSources",
    "styleSourceSelections", props, "dataSources", resources, instances,
    "marketplaceProduct", "projectSettings", "publishStatus", "projectId", id, deployment
  )
  SELECT
    version, "lastTransactionId", pages, breakpoints, styles, "styleSources",
    "styleSourceSelections", props, "dataSources", resources, instances,
    "marketplaceProduct", "projectSettings", "publishStatus", "projectId",
    extensions.uuid_generate_v4(), create_production_build.deployment
  FROM "Build"
  WHERE "projectId" = project_id AND "Build".deployment IS NULL
  RETURNING id INTO new_build_id;
  IF new_build_id IS NULL THEN
    RAISE EXCEPTION 'Development build not found';
  END IF;
  RETURN new_build_id;
END;
$$ LANGUAGE plpgsql;

COMMIT;
