DROP VIEW IF EXISTS "LatestBuildPerProjectDomain" CASCADE;
DROP VIEW IF EXISTS  "LatestStaticBuildPerProject" CASCADE;
DROP VIEW "ApprovedMarketplaceProduct";
DROP VIEW IF EXISTS "DashboardProject";
DROP VIEW IF EXISTS "ProjectWithDomain";

-- AlterTable
ALTER TABLE "AuthorizationToken" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "Build" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "ClientReferences" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "Domain" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "File" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "ProjectDomain" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "TransactionLog" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3);


CREATE OR REPLACE VIEW "LatestStaticBuildPerProject" AS
SELECT DISTINCT ON ("projectId")
  bld.id AS "buildId",
  bld."projectId",
  bld."updatedAt",
  bld."publishStatus"
FROM
  "Build" bld
WHERE
  bld.deployment IS NOT NULL
  AND bld.deployment::jsonb ->> 'destination'::text = 'static'
ORDER BY
  bld."projectId",
  bld."createdAt" DESC,
  "buildId";



CREATE VIEW "ApprovedMarketplaceProduct" AS
SELECT DISTINCT ON (build."projectId")
  build."projectId",
  build."marketplaceProduct",
  (
    SELECT
      token
    FROM
      "AuthorizationToken" auth
    WHERE
      auth."projectId" = build."projectId" AND
      auth.relation = 'viewers'
    ORDER BY
      auth."token"
    LIMIT 1
  ) AS "authorizationToken"
FROM
  "Build" build
WHERE
  build.deployment IS NOT NULL -- published
  AND build."projectId" IN (
    SELECT
      "id"
    FROM
      "Project"
    WHERE ("isDeleted" = FALSE
      AND "marketplaceApprovalStatus" = CAST('APPROVED'::text AS "MarketplaceApprovalStatus")))
ORDER BY
  build."projectId",
  build."createdAt" DESC,
  build.id;

CREATE VIEW "DashboardProject" AS
SELECT
  *,
  EXISTS (
    SELECT
      1
    from
      "Build"
    WHERE
      "Build"."projectId" = "Project".id
      AND "Build"."deployment" IS NOT NULL
  ) AS "isPublished"
FROM
  "Project";

CREATE OR REPLACE VIEW "ProjectWithDomain" AS
SELECT
  pd."projectId",
  pd."domainId",
  pd."txtRecord",
  pd."cname",
  pd."createdAt",
  -- any DNS txt record change would cause verified to be changed immediately
  coalesce(pd."txtRecord" = d."txtRecord", false) AS verified,
  -- domains count per user
  p."userId"
FROM
  "ProjectDomain" pd
  LEFT JOIN "Domain" d ON pd."domainId" = d.id
  LEFT JOIN "Project" p ON pd."projectId" = p.id
  WHERE p."isDeleted" = FALSE;


DROP FUNCTION update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
    ) LOOP
        -- Check if the table has the 'updatedAt' column
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = r.table_name
            AND column_name = 'updatedAt'
        ) THEN
            EXECUTE format('
                CREATE TRIGGER %I
                BEFORE UPDATE ON %I
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();',
                r.table_name || '_update_updated_at_trigger', r.table_name);
        END IF;
    END LOOP;
END $$;