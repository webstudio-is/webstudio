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

-- Grant execute permissions to all PostgREST roles (only if they exist)
DO $$
BEGIN
  -- Grant to anon if role exists
  IF EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'anon'
  ) THEN
    GRANT EXECUTE ON FUNCTION "latestBuildVirtual"("DashboardProject") TO anon;
  END IF;
  
  -- Grant to authenticated if role exists
  IF EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'authenticated'
  ) THEN
    GRANT EXECUTE ON FUNCTION "latestBuildVirtual"("DashboardProject") TO authenticated;
  END IF;
  
  -- Grant to service_role if role exists
  IF EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'service_role'
  ) THEN
    GRANT EXECUTE ON FUNCTION "latestBuildVirtual"("DashboardProject") TO service_role;
  END IF;
END $$;