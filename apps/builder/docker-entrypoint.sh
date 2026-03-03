#!/bin/sh
set -e

# Allow DATABASE_URL to serve as DIRECT_URL when no PgBouncer is present
export DIRECT_URL="${DIRECT_URL:-${DATABASE_URL}}"

echo "Running database migrations..."
/prisma/node_modules/.bin/prisma migrate deploy --schema=/app/prisma/schema.prisma

echo "Starting Webstudio builder..."
exec node /app/node_modules/@remix-run/serve/dist/cli.js /app/build/server/index.js
