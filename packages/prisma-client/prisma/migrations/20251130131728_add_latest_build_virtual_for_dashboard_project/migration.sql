-- Add latestBuildVirtual function overload for DashboardProject view
-- This is needed because PostgREST computed fields require a function
-- that matches the source table/view type. DashboardProject is a view
-- over Project, so we need this wrapper function.
CREATE
OR REPLACE FUNCTION "latestBuildVirtual"("DashboardProject") RETURNS SETOF "latestBuildVirtual" ROWS 1 AS $$
SELECT
  *
FROM
  "latestBuildVirtual"(
    (
      SELECT
        p
      FROM
        "Project" p
      WHERE
        p.id = $ 1.id
    )
  );

$$ STABLE LANGUAGE sql;

COMMENT ON FUNCTION "latestBuildVirtual"("DashboardProject") IS 'Wrapper function to make latestBuildVirtual work with DashboardProject view for PostgREST computed fields.';

-- Grant execute permissions to all PostgREST roles
-- Uses DO block to check if roles exist before granting (prevents errors if roles are missing)
DO $$
DECLARE
  role_name TEXT;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated', 'service_role']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION "latestBuildVirtual"("DashboardProject") TO %I', role_name);
    END IF;
  END LOOP;
END $$;