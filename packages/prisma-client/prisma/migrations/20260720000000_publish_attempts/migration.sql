CREATE TYPE "PublishAttemptTarget" AS ENUM ('STAGING', 'PRODUCTION', 'STATIC');
CREATE TYPE "PublishAttemptStatus" AS ENUM ('VALIDATING', 'BLOCKED', 'QUEUED', 'BUILDING', 'SUCCEEDED', 'FAILED');
CREATE TYPE "PublishReportAvailability" AS ENUM ('NOT_CREATED', 'PENDING', 'AVAILABLE', 'UNAVAILABLE');

CREATE TABLE "PublishAttempt" (
  "id" text PRIMARY KEY,
  "projectId" text NOT NULL,
  "buildId" text,
  "artifactName" varchar(255),
  "target" "PublishAttemptTarget" NOT NULL,
  "targetKeys" text[] NOT NULL,
  "targetLabels" text[] NOT NULL,
  "status" "PublishAttemptStatus" NOT NULL DEFAULT 'VALIDATING',
  "failureCode" text,
  "auditErrorCount" integer NOT NULL DEFAULT 0,
  "auditWarningCount" integer NOT NULL DEFAULT 0,
  "diagnosticErrors" integer NOT NULL DEFAULT 0,
  "diagnosticWarnings" integer NOT NULL DEFAULT 0,
  "issues" jsonb NOT NULL DEFAULT '[]',
  "summary" varchar(512) NOT NULL,
  "retentionDays" integer NOT NULL DEFAULT 0 CHECK ("retentionDays" IN (0, 1, 30)),
  "expiresAt" timestamptz(3),
  "reportAvailability" "PublishReportAvailability" NOT NULL DEFAULT 'NOT_CREATED',
  "idempotencyHash" text,
  "createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" timestamptz(3),
  "completedAt" timestamptz(3),
  CONSTRAINT "PublishAttempt_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "PublishAttempt_projectId_idempotencyHash_key" ON "PublishAttempt"("projectId", "idempotencyHash");
CREATE INDEX "PublishAttempt_projectId_createdAt_id_idx" ON "PublishAttempt"("projectId", "createdAt" DESC, "id" DESC);
CREATE INDEX "PublishAttempt_targetKeys_idx" ON "PublishAttempt" USING GIN ("targetKeys");
CREATE INDEX "PublishAttempt_buildId_idx" ON "PublishAttempt"("buildId");
CREATE INDEX "PublishAttempt_expiresAt_idx" ON "PublishAttempt"("expiresAt");

CREATE FUNCTION create_production_build_expected(
  project_id text,
  deployment text,
  expected_version integer
) RETURNS text AS $$
DECLARE
  new_build_id text;
BEGIN
  INSERT INTO "Build" (
    version, "lastTransactionId", pages, breakpoints, styles, "styleSources",
    "styleSourceSelections", props, "dataSources", resources, instances,
    "marketplaceProduct", "projectSettings", "publishStatus", "projectId", id,
    deployment
  )
  SELECT
    version, "lastTransactionId", pages, breakpoints, styles, "styleSources",
    "styleSourceSelections", props, "dataSources", resources, instances,
    "marketplaceProduct", "projectSettings", "publishStatus", "projectId",
    extensions.uuid_generate_v4(), create_production_build_expected.deployment
  FROM "Build"
  WHERE "projectId" = project_id
    AND "Build".deployment IS NULL
    AND version = expected_version
  RETURNING id INTO new_build_id;

  RETURN new_build_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_publish_attempts(
  before_date timestamptz DEFAULT CURRENT_TIMESTAMP - INTERVAL '30 days'
) RETURNS void AS $$
BEGIN
  WITH latest_attempts_by_target AS (
    SELECT DISTINCT ON (attempt."projectId", target_key) attempt.id
    FROM "PublishAttempt" attempt
    CROSS JOIN LATERAL unnest(attempt."targetKeys") AS target_key
    ORDER BY attempt."projectId", target_key, attempt."createdAt" DESC, attempt.id DESC
  )
  DELETE FROM "PublishAttempt"
  WHERE "createdAt" < before_date
    AND id NOT IN (SELECT id FROM latest_attempts_by_target);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION database_cleanup(
  from_date timestamp DEFAULT '2020-01-01 00:00:00',
  to_date timestamp DEFAULT '2099-12-31 23:59:59'
) RETURNS void AS $$
BEGIN
  WITH latest_builds AS (
    SELECT "buildId" FROM "Project" p, LATERAL "latestProjectDomainBuildVirtual"(p)
    UNION
    SELECT "buildId" FROM "Project" p, LATERAL "latestBuildVirtual"(p)
    UNION
    SELECT lb."buildId"
    FROM "Project" p, LATERAL "domainsVirtual"(p) dv, LATERAL "latestBuildVirtual"(dv) lb
  )
  UPDATE "Build"
  SET
    "styleSources" = '[]', styles = '[]', breakpoints = '[]',
    "styleSourceSelections" = '[]', props = '[]', instances = '[]',
    "dataSources" = '[]', resources = '[]', "marketplaceProduct" = '{}',
    "projectSettings" = '{"meta":{},"compiler":{}}', "isCleaned" = true
  WHERE deployment IS NOT NULL
    AND id NOT IN (SELECT "buildId" FROM latest_builds)
    AND "isCleaned" = false
    AND "createdAt" BETWEEN from_date AND to_date;

  PERFORM cleanup_publish_attempts(
    LEAST(to_date AT TIME ZONE 'UTC', CURRENT_TIMESTAMP - INTERVAL '30 days')
  );
END;
$$ LANGUAGE plpgsql;
