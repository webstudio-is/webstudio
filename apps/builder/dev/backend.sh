#!/usr/bin/env bash

builder_backend_init() {
  ROOT_DIR="${ROOT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)}"
  SCHEMA_SNAPSHOT="${SCHEMA_SNAPSHOT:-$ROOT_DIR/apps/builder/e2e/schema/current.sql}"
  COMPOSE_ENV=(
    --env-file "$ROOT_DIR/apps/builder/.env"
    --env-file "$ROOT_DIR/apps/builder/.env.development"
  )
  COMPOSE_FILES=(
    -f "$ROOT_DIR/apps/builder/docker-compose.yaml"
    -f "$COMPOSE_OVERRIDE_FILE"
  )
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

builder_backend_wait_for_db() {
  local timeout_seconds="${1:-60}"
  local timeout_at
  timeout_at="$(($(date +%s) + timeout_seconds))"

  until builder_compose exec -T db \
    sh -c 'psql -q -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -c "SELECT 1"' \
    >/dev/null 2>&1; do
    if [ "$(date +%s)" -ge "$timeout_at" ]; then
      echo "Timed out waiting for database" >&2
      return 1
    fi
    sleep 0.2
  done
}

builder_backend_has_schema() {
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
        echo "Bootstrapped database from $SCHEMA_SNAPSHOT"
      else
        echo "No schema snapshot found at $SCHEMA_SNAPSHOT; falling back to migrations"
        builder_backend_migrate
      fi
      ;;
    missing)
      if builder_backend_has_schema; then
        echo "Database schema already exists; skipping bootstrap"
      else
        builder_backend_bootstrap auto
      fi
      ;;
    *)
      echo "Unknown database bootstrap mode: $1" >&2
      exit 1
      ;;
  esac
}

builder_backend_write_schema_snapshot() {
  mkdir -p "$(dirname "$SCHEMA_SNAPSHOT")"
  builder_compose exec -T db \
    sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --schema-only --no-owner --no-privileges' \
    >"$SCHEMA_SNAPSHOT"
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
