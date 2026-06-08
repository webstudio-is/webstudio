#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/apps/builder/docker-compose.e2e.yaml"
SCHEMA_SNAPSHOT="$ROOT_DIR/apps/builder/e2e/schema/current.sql"

export AUTH_SECRET="${AUTH_SECRET:-test}"
export DATABASE_URL="${DATABASE_URL:-postgresql://user:pass@localhost:55432/webstudio}"
export DIRECT_URL="${DIRECT_URL:-$DATABASE_URL}"
export E2E_DB_BOOTSTRAP="${E2E_DB_BOOTSTRAP:-auto}"
export E2E_GENERATE_PRISMA="${E2E_GENERATE_PRISMA:-auto}"
export E2E_PGPORT="${E2E_PGPORT:-55432}"
export E2E_POSTGREST_PORT="${E2E_POSTGREST_PORT:-55433}"
export POSTGREST_API_KEY="${POSTGREST_API_KEY:-}"
export POSTGREST_URL="${POSTGREST_URL:-http://127.0.0.1:55433}"
export TRPC_SERVER_API_TOKEN="${TRPC_SERVER_API_TOKEN:-e2e-service-token}"
export E2E_DOCKER_TIMEOUT_SECONDS="${E2E_DOCKER_TIMEOUT_SECONDS:-60}"
export E2E_MIGRATIONS_TIMEOUT_SECONDS="${E2E_MIGRATIONS_TIMEOUT_SECONDS:-300}"
export E2E_INSTALL_PLAYWRIGHT="${E2E_INSTALL_PLAYWRIGHT:-auto}"
export E2E_PLAYWRIGHT_INSTALL_TIMEOUT_SECONDS="${E2E_PLAYWRIGHT_INSTALL_TIMEOUT_SECONDS:-300}"
export E2E_RUN_TESTS="${E2E_RUN_TESTS:-true}"
export E2E_PACKAGE_BUILD_TIMEOUT_SECONDS="${E2E_PACKAGE_BUILD_TIMEOUT_SECONDS:-120}"
export E2E_BUILDER_BUILD_TIMEOUT_SECONDS="${E2E_BUILDER_BUILD_TIMEOUT_SECONDS:-600}"
export E2E_TEST_COMMAND_TIMEOUT_SECONDS="${E2E_TEST_COMMAND_TIMEOUT_SECONDS:-900}"
export E2E_WRITE_SCHEMA_SNAPSHOT="${E2E_WRITE_SCHEMA_SNAPSHOT:-false}"

RUN_STARTED_AT="$(date +%s%3N)"

now_ms() {
  date +%s%3N
}

cleanup() {
  if [ "${E2E_SKIP_CLEANUP:-}" = "true" ]; then
    return
  fi

  local started_at
  started_at="$(now_ms)"
  docker compose -f "$COMPOSE_FILE" down --volumes --remove-orphans
  local duration_ms
  duration_ms="$(($(now_ms) - started_at))"
  echo "[e2e:perf] phase=cleanup duration=${duration_ms}ms"
}

trap cleanup EXIT

run_step() {
  local name="$1"
  local timeout_seconds="$2"
  shift 2

  local started_at
  started_at="$(now_ms)"
  echo "▶ $name"
  "$@" &
  local pid="$!"
  local timeout_at
  timeout_at="$(($(now_ms) + timeout_seconds * 1000))"
  while kill -0 "$pid" 2>/dev/null; do
    if [ "$(now_ms)" -ge "$timeout_at" ]; then
      echo "Timed out after ${timeout_seconds}s: $name" >&2
      kill "$pid" 2>/dev/null || true
      sleep 10
      kill -9 "$pid" 2>/dev/null || true
      wait "$pid" || true
      return 124
    fi
    sleep 0.1
  done
  local status=0
  wait "$pid" || status="$?"
  if [ "$status" -ne 0 ]; then
    return "$status"
  fi
  local duration_ms
  duration_ms="$(($(now_ms) - started_at))"
  echo "✓ $name"
  echo "[e2e:perf] phase=\"$name\" duration=${duration_ms}ms"
}

wait_for_step() {
  local name="$1"
  local pid="$2"
  local status=0

  wait "$pid" || status="$?"
  if [ "$status" -ne 0 ]; then
    echo "Step failed: $name" >&2
    return "$status"
  fi
}

bootstrap_with_schema_snapshot() {
  if [ ! -f "$SCHEMA_SNAPSHOT" ]; then
    return 1
  fi

  docker compose -f "$COMPOSE_FILE" exec -T db \
    psql -q -U user -d webstudio -v ON_ERROR_STOP=1 <"$SCHEMA_SNAPSHOT" \
    >/dev/null
}

bootstrap_with_migrations() {
  pnpm --dir "$ROOT_DIR" --filter=./packages/prisma-client migrations migrate --dev --cwd ../../apps/builder
}

write_schema_snapshot() {
  mkdir -p "$(dirname "$SCHEMA_SNAPSHOT")"
  docker compose -f "$COMPOSE_FILE" exec -T db \
    pg_dump -U user -d webstudio --schema-only --no-owner --no-privileges \
    >"$SCHEMA_SNAPSHOT"
  echo "Wrote $SCHEMA_SNAPSHOT"
}

bootstrap_database() {
  case "$E2E_DB_BOOTSTRAP" in
    schema)
      bootstrap_with_schema_snapshot
      ;;
    migrations)
      bootstrap_with_migrations
      ;;
    auto)
      if [ -f "$SCHEMA_SNAPSHOT" ]; then
        bootstrap_with_schema_snapshot
        echo "Bootstrapped database from $SCHEMA_SNAPSHOT"
      else
        echo "No schema snapshot found at $SCHEMA_SNAPSHOT; falling back to migrations"
        bootstrap_with_migrations
      fi
      ;;
    *)
      echo "Unknown E2E_DB_BOOTSTRAP value: $E2E_DB_BOOTSTRAP" >&2
      exit 1
      ;;
  esac

  if [ "$E2E_WRITE_SCHEMA_SNAPSHOT" = "true" ]; then
    write_schema_snapshot
  fi
}

has_prisma_client() {
  [ -f "$ROOT_DIR/packages/prisma-client/src/__generated__/index.js" ]
}

generate_prisma_client() {
  case "$E2E_GENERATE_PRISMA" in
    true)
      pnpm --dir "$ROOT_DIR" --filter=@webstudio-is/prisma-client generate
      ;;
    false)
      echo "Skipping Prisma client generation"
      ;;
    auto)
      if has_prisma_client; then
        echo "Skipping Prisma client generation; generated client already exists"
      else
        pnpm --dir "$ROOT_DIR" --filter=@webstudio-is/prisma-client generate
      fi
      ;;
    *)
      echo "Unknown E2E_GENERATE_PRISMA value: $E2E_GENERATE_PRISMA" >&2
      exit 1
      ;;
  esac
}

has_playwright_chromium() {
  (
    cd "$ROOT_DIR/apps/builder"
    node -e "const { chromium } = require('playwright'); const fs = require('fs'); process.exit(fs.existsSync(chromium.executablePath()) ? 0 : 1)"
  )
}

install_playwright_chromium() {
  case "$E2E_INSTALL_PLAYWRIGHT" in
    true)
      pnpm --dir "$ROOT_DIR" --filter=@webstudio-is/builder exec playwright install --with-deps chromium
      ;;
    false)
      echo "Skipping Playwright Chromium install"
      ;;
    auto)
      if has_playwright_chromium; then
        echo "Skipping Playwright Chromium install; browser already exists"
      else
        pnpm --dir "$ROOT_DIR" --filter=@webstudio-is/builder exec playwright install --with-deps chromium
      fi
      ;;
    *)
      echo "Unknown E2E_INSTALL_PLAYWRIGHT value: $E2E_INSTALL_PLAYWRIGHT" >&2
      exit 1
      ;;
  esac
}

build_builder_package_entries() {
  pnpm --dir "$ROOT_DIR" --filter=@webstudio-is/http-client build
}

build_builder_app() {
  pnpm --dir "$ROOT_DIR" --filter=@webstudio-is/builder build
}

wait_for_database() {
  local timeout_at
  timeout_at="$(($(now_ms) + E2E_DOCKER_TIMEOUT_SECONDS * 1000))"

  until docker compose -f "$COMPOSE_FILE" exec -T db \
    psql -q -U user -d webstudio -v ON_ERROR_STOP=1 -c "SELECT 1" \
    >/dev/null 2>&1; do
    if [ "$(now_ms)" -ge "$timeout_at" ]; then
      echo "Timed out waiting for e2e database" >&2
      return 1
    fi
    sleep 0.1
  done
}

run_step "start e2e database" "$E2E_DOCKER_TIMEOUT_SECONDS" \
  docker compose -f "$COMPOSE_FILE" up -d db

run_step "generate prisma client" "$E2E_MIGRATIONS_TIMEOUT_SECONDS" \
  generate_prisma_client &
generate_prisma_client_pid="$!"

if [ "$E2E_RUN_TESTS" = "true" ]; then
  run_step "install playwright chromium" "$E2E_PLAYWRIGHT_INSTALL_TIMEOUT_SECONDS" \
    install_playwright_chromium &
  install_playwright_chromium_pid="$!"

  run_step "build builder package entries" "$E2E_PACKAGE_BUILD_TIMEOUT_SECONDS" \
    build_builder_package_entries &
  build_builder_package_entries_pid="$!"
fi

run_step "wait for e2e database" "$E2E_DOCKER_TIMEOUT_SECONDS" \
  wait_for_database

run_step "bootstrap database schema" "$E2E_MIGRATIONS_TIMEOUT_SECONDS" \
  bootstrap_database

wait_for_step "generate prisma client" "$generate_prisma_client_pid"

if [ "$E2E_RUN_TESTS" = "true" ]; then
  wait_for_step "install playwright chromium" "$install_playwright_chromium_pid"
  wait_for_step "build builder package entries" "$build_builder_package_entries_pid"

  run_step "start e2e postgrest" "$E2E_DOCKER_TIMEOUT_SECONDS" \
    docker compose -f "$COMPOSE_FILE" up -d postgrest

  if [ "${E2E_BUILDER_URL:-}" = "" ]; then
    run_step "build builder app" "$E2E_BUILDER_BUILD_TIMEOUT_SECONDS" \
      build_builder_app
  fi

  run_step "run builder e2e tests" "$E2E_TEST_COMMAND_TIMEOUT_SECONDS" \
    pnpm --dir "$ROOT_DIR" --filter=@webstudio-is/builder e2e:ci
fi

TOTAL_DURATION_MS="$(($(now_ms) - RUN_STARTED_AT))"
echo "[e2e:perf] phase=total duration=${TOTAL_DURATION_MS}ms"
