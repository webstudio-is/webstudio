-- Webstudio's migrations use the Supabase convention of calling uuid functions
-- through an explicit "extensions" schema (e.g. extensions.uuid_generate_v4()).
-- This init script replicates that setup on a plain PostgreSQL instance.
--
-- Some older migrations also call uuid_generate_v4() without schema qualification.
-- Setting the database search_path to include "extensions" makes both forms work.

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;

ALTER DATABASE webstudio SET search_path TO "$user", public, extensions;

-- Create the "anon" role used by PostgREST for all requests (JWT role = "anon").
-- In Supabase this role exists by default; we replicate it here.
CREATE ROLE anon NOLOGIN;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant full access on all tables/sequences created by Prisma migrations.
-- ALTER DEFAULT PRIVILEGES applies to objects created by the current user (postgres)
-- in the future, so Prisma tables will automatically be accessible to PostgREST.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
