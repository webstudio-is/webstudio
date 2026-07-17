#!/usr/bin/env bash

builder_backend_init() {
  ROOT_DIR="${ROOT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)}"
  SCHEMA_SNAPSHOT="${SCHEMA_SNAPSHOT:-$ROOT_DIR/.cache/builder-e2e/schema-$(builder_backend_migrations_fingerprint).sql}"
  COMPOSE_ENV=(
    --env-file "$ROOT_DIR/apps/builder/.env"
  )
  if [ -f "$ROOT_DIR/apps/builder/.env.development" ]; then
    COMPOSE_ENV+=(--env-file "$ROOT_DIR/apps/builder/.env.development")
  fi
  COMPOSE_FILES=(
    -f "$ROOT_DIR/apps/builder/docker-compose.yaml"
    -f "$COMPOSE_OVERRIDE_FILE"
  )
}

builder_backend_migrations_fingerprint() {
  (
    cd "$ROOT_DIR"
    {
      find packages/prisma-client/prisma/migrations \
        -mindepth 1 -maxdepth 1 -type d -print
      find packages/prisma-client/prisma/migrations \
        -type f \( -name migration.sql -o -name migration.ts \) -print
    } | LC_ALL=C sort | while IFS= read -r path; do
      if [ -f "$path" ]; then
        printf '%s ' "$path"
        git hash-object "$path"
      else
        printf '%s directory\n' "$path"
      fi
    done
  ) | git hash-object --stdin
}

builder_compose() {
  docker compose "${COMPOSE_ENV[@]}" "${COMPOSE_FILES[@]}" "$@"
}

builder_backend_down() {
  builder_compose down "$@"
}

builder_backend_start_db() {
  builder_compose up -d db
}

builder_backend_start_postgrest() {
  builder_compose up -d postgrest
}

builder_backend_wait_for_postgrest() {
  local timeout_seconds="${1:-60}"
  local port
  port="$(builder_compose port postgrest 3000)"
  local url="http://127.0.0.1:${port##*:}/UserProduct?select=userId&limit=0"
  local timeout_at
  timeout_at="$(($(date +%s) + timeout_seconds))"

  until {
    local status
    status="$(curl -s -o /dev/null -w "%{http_code}" "$url" || true)"
    [ "$status" -ge 200 ] && [ "$status" -lt 500 ]
  }; do
    if [ "$(date +%s)" -ge "$timeout_at" ]; then
      echo "Timed out waiting for PostgREST" >&2
      return 1
    fi
    sleep 0.2
  done
}

builder_backend_wait_for_db() {
  local timeout_seconds="${1:-60}"
  local timeout_at
  timeout_at="$(($(date +%s) + timeout_seconds))"

  # Connect over TCP, not the unix socket: the postgres image's entrypoint
  # runs a temporary socket-only server (listen_addresses='') during init,
  # which lets a socket probe pass while host clients (prisma migrate,
  # postgrest) still get connection refused.
  until builder_compose exec -T db \
    sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" psql -q -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -c "SELECT 1"' \
    >/dev/null 2>&1; do
    if [ "$(date +%s)" -ge "$timeout_at" ]; then
      echo "Timed out waiting for database" >&2
      return 1
    fi
    sleep 0.2
  done
}

builder_backend_schema_exists() {
  [ "$(
    builder_compose exec -T db \
      sh -c 'psql -q -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT to_regclass('\''public.\"Project\"'\'') IS NOT NULL"'
  )" = "t" ]
}

builder_backend_bootstrap_schema_snapshot() {
  if [ ! -f "$SCHEMA_SNAPSHOT" ]; then
    return 1
  fi

  builder_compose exec -T db \
    sh -c 'psql -q -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1' \
    <"$SCHEMA_SNAPSHOT" >/dev/null
}

builder_backend_migrate() {
  pnpm --dir "$ROOT_DIR" --filter=./packages/prisma-client migrations migrate --dev --cwd ../../apps/builder
}

builder_backend_bootstrap() {
  case "${1:-auto}" in
    schema)
      builder_backend_bootstrap_schema_snapshot
      ;;
    migrations)
      builder_backend_migrate
      ;;
    auto)
      if [ -f "$SCHEMA_SNAPSHOT" ]; then
        builder_backend_bootstrap_schema_snapshot
        echo "Bootstrapped database from cached schema $SCHEMA_SNAPSHOT"
      else
        echo "No cached schema found at $SCHEMA_SNAPSHOT; running migrations"
        builder_backend_migrate
        builder_backend_write_schema_snapshot
      fi
      ;;
    *)
      echo "Unknown database bootstrap mode: $1" >&2
      exit 1
      ;;
  esac
}

builder_backend_bootstrap_if_empty() {
  if builder_backend_schema_exists; then
    echo "Database schema already exists; skipping bootstrap"
  else
    builder_backend_bootstrap auto
  fi
}

builder_backend_write_schema_snapshot() {
  mkdir -p "$(dirname "$SCHEMA_SNAPSHOT")"
  local temporary_snapshot="${SCHEMA_SNAPSHOT}.tmp.$$"
  if builder_compose exec -T db \
    sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --schema-only --no-owner --no-privileges' \
    >"$temporary_snapshot"; then
    mv "$temporary_snapshot" "$SCHEMA_SNAPSHOT"
  else
    rm -f "$temporary_snapshot"
    return 1
  fi
  echo "Wrote $SCHEMA_SNAPSHOT"
}

builder_prisma_client_exists() {
  [ -f "$ROOT_DIR/packages/prisma-client/src/__generated__/index.js" ]
}

builder_generate_prisma_client() {
  case "${1:-auto}" in
    true)
      pnpm --dir "$ROOT_DIR" --filter=@webstudio-is/prisma-client generate
      ;;
    false)
      echo "Skipping Prisma client generation"
      ;;
    auto)
      if builder_prisma_client_exists; then
        echo "Skipping Prisma client generation; generated client already exists"
      else
        pnpm --dir "$ROOT_DIR" --filter=@webstudio-is/prisma-client generate
      fi
      ;;
    *)
      echo "Unknown Prisma generation mode: $1" >&2
      exit 1
      ;;
  esac
}
