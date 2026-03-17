#!/bin/sh
set -e

# Allow DATABASE_URL to serve as DIRECT_URL when no PgBouncer is present
export DIRECT_URL="${DIRECT_URL:-${DATABASE_URL}}"

# Derive POSTGREST_API_KEY from PGRST_JWT_SECRET if not explicitly set.
# Generates a HS256 JWT with payload {"role":"anon"} using only Node built-ins.
if [ -z "${POSTGREST_API_KEY}" ] && [ -n "${PGRST_JWT_SECRET}" ]; then
  export POSTGREST_API_KEY=$(node -e "
    const crypto = require('node:crypto');
    const h = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
    const p = Buffer.from(JSON.stringify({role:'anon'})).toString('base64url');
    const sig = crypto.createHmac('sha256', process.env.PGRST_JWT_SECRET).update(h+'.'+p).digest('base64url');
    console.log(h+'.'+p+'.'+sig);
  ")
fi

echo "Running database migrations..."
/prisma/node_modules/.bin/prisma migrate deploy --schema=/app/prisma/schema.prisma

echo "Starting Webstudio builder..."
exec node /app/server.js
