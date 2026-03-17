# syntax=docker/dockerfile:1
# Build context: repo root (docker build -f apps/builder/Dockerfile .)

# ─── Stage 1: builder ────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.14.4 --activate

WORKDIR /app
COPY . .

# Full install
RUN pnpm install --frozen-lockfile

# Generate the Prisma client (creates src/__generated__/ with Alpine engine binary).
# Must run before tsc because src/prisma.ts imports from ./__generated__.
RUN pnpm --filter=@webstudio-is/prisma-client generate

# `prisma migrate deploy` requires a migration.sql in every migration directory.
# TypeScript data migrations have no .sql file — create a no-op placeholder so
# the tool can track them in _prisma_migrations without error.
# On a fresh database these TS migrations are no-ops anyway (no data to transform).
RUN find packages/prisma-client/prisma/migrations -mindepth 1 -maxdepth 1 -type d | \
    while read dir; do \
      if [ ! -f "$dir/migration.sql" ] && [ -f "$dir/migration.ts" ]; then \
        echo "-- TypeScript data migration: no SQL changes" > "$dir/migration.sql"; \
      fi; \
    done

# Some migrations use extensions.uuid_generate_v4() — a Supabase convention that
# requires the uuid-ossp extension installed in an "extensions" schema.
# Replace with gen_random_uuid() which is built into PostgreSQL 13+ with no extension.
RUN find packages/prisma-client/prisma/migrations -name "migration.sql" -exec \
    sed -i 's/extensions\.uuid_generate_v4()/gen_random_uuid()/g' {} +

# pgtap is a PostgreSQL unit-testing extension used only in Supabase CI.
# It is not available in postgres:15-alpine and not needed for the production app.
# Replace its migration with a no-op so prisma migrate deploy can track it.
RUN PGTAP=packages/prisma-client/prisma/migrations/20240917152817_pgtap/migration.sql && \
    if [ -f "$PGTAP" ]; then \
      echo "-- pgtap extension skipped: testing-only, not available in standard PostgreSQL images" \
        > "$PGTAP"; \
    fi

# Compile @webstudio-is/prisma-client TypeScript → lib/
# This is required so the package's "import" export condition resolves correctly.
# The compiled lib/ is NOT in the package's own .gitignore, so pnpm deploy copies it.
RUN node_modules/.bin/tsc --project packages/prisma-client/tsconfig.json

# Build http-client (required before builder build, mirrors Vercel build command)
# then build the builder itself
RUN pnpm --filter=@webstudio-is/http-client build && \
    pnpm --filter=@webstudio-is/builder build

# Create a production-only standalone deployment.
# Note: packages/prisma-client/src/__generated__ is listed in the ROOT .gitignore
# (not in the package's own .gitignore) specifically so pnpm deploy includes it.
RUN pnpm --filter "@webstudio-is/builder" --prod deploy /standalone

# ─── Stage 2: prisma-cli ─────────────────────────────────────────────────────
# Install the Prisma CLI in isolation so it carries Alpine-compatible engine binaries
# without polluting the app's node_modules.
FROM node:22-alpine AS prisma-cli

WORKDIR /prisma
RUN echo '{"name":"prisma-migration-runner","version":"1.0.0","dependencies":{"prisma":"5.12.1"}}' \
      > package.json && \
    npm install --no-fund --no-audit --loglevel=error

# ─── Stage 3: runner ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

# OpenSSL is required by Prisma engine binaries
RUN apk add --no-cache openssl

WORKDIR /app

# Production node_modules (pnpm deploy)
COPY --from=builder /standalone/node_modules ./node_modules

# Remix server build output (gitignored in the repo, so copied explicitly)
COPY --from=builder /app/apps/builder/build ./build
COPY --from=builder /app/apps/builder/public ./public
COPY --from=builder /app/apps/builder/package.json ./package.json

# Prisma schema + SQL migrations for `prisma migrate deploy`
COPY --from=builder /app/packages/prisma-client/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=builder /app/packages/prisma-client/prisma/migrations ./prisma/migrations

# Prisma CLI (isolated from app node_modules)
COPY --from=prisma-cli /prisma /prisma

# Entrypoint
COPY apps/builder/server.js /app/server.js
COPY apps/builder/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Run as non-root
RUN addgroup -g 1001 -S nodejs && adduser -S -u 1001 -G nodejs remix
RUN chown -R remix:nodejs /app /prisma
USER remix

EXPOSE 3000
ENV PORT=3000 NODE_ENV=production

ENTRYPOINT ["/docker-entrypoint.sh"]
