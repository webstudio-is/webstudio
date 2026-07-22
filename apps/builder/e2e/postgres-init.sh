#!/bin/sh
set -eu

# Supabase installs extensions outside public and includes that schema in the
# database role's search path. Keep the disposable E2E database compatible so
# historical migrations exercise the same assumptions as production.
psql \
  --set=ON_ERROR_STOP=1 \
  --set=database_user="$POSTGRES_USER" \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" <<'SQL'
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
ALTER ROLE :"database_user" SET search_path = "$user", public, extensions;
SQL
