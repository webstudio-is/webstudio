#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
COMPOSE_OVERRIDE_FILE="$ROOT_DIR/apps/builder/docker-compose.e2e.yaml"
source "$ROOT_DIR/apps/builder/dev/backend.sh"
builder_backend_init

export E2E_DB_BOOTSTRAP="${E2E_DB_BOOTSTRAP:-auto}"
export E2E_GENERATE_PRISMA="${E2E_GENERATE_PRISMA:-auto}"
export E2E_DOCKER_TIMEOUT_SECONDS="${E2E_DOCKER_TIMEOUT_SECONDS:-60}"
export E2E_MIGRATIONS_TIMEOUT_SECONDS="${E2E_MIGRATIONS_TIMEOUT_SECONDS:-300}"
export E2E_INSTALL_PLAYWRIGHT="${E2E_INSTALL_PLAYWRIGHT:-auto}"
export E2E_PLAYWRIGHT_INSTALL_TIMEOUT_SECONDS="${E2E_PLAYWRIGHT_INSTALL_TIMEOUT_SECONDS:-300}"
export E2E_RUN_TESTS="${E2E_RUN_TESTS:-true}"
export E2E_BUILDER_BUILD_TIMEOUT_SECONDS="${E2E_BUILDER_BUILD_TIMEOUT_SECONDS:-600}"
export E2E_TEST_COMMAND_TIMEOUT_SECONDS="${E2E_TEST_COMMAND_TIMEOUT_SECONDS:-900}"
export E2E_WRITE_SCHEMA_SNAPSHOT="${E2E_WRITE_SCHEMA_SNAPSHOT:-false}"

now_ms() {
  node -e "console.log(Date.now())"
}

RUN_STARTED_AT="$(now_ms)"

cleanup() {
  if [ "${E2E_SKIP_CLEANUP:-}" = "true" ]; then
    return
  fi

  local started_at
  started_at="$(now_ms)"
  builder_backend_down --volumes --remove-orphans
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

bootstrap_database() {
  builder_backend_bootstrap "$E2E_DB_BOOTSTRAP"

  if [ "$E2E_WRITE_SCHEMA_SNAPSHOT" = "true" ]; then
    builder_backend_write_schema_snapshot
  fi
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

build_builder_app() {
  pnpm --dir "$ROOT_DIR" --filter=@webstudio-is/builder build
}

run_step "start e2e database" "$E2E_DOCKER_TIMEOUT_SECONDS" \
  builder_backend_start_db

run_step "generate prisma client" "$E2E_MIGRATIONS_TIMEOUT_SECONDS" \
  builder_generate_prisma_client "$E2E_GENERATE_PRISMA" &
generate_prisma_client_pid="$!"

if [ "$E2E_RUN_TESTS" = "true" ]; then
  run_step "install playwright chromium" "$E2E_PLAYWRIGHT_INSTALL_TIMEOUT_SECONDS" \
    install_playwright_chromium &
  install_playwright_chromium_pid="$!"
fi

run_step "wait for e2e database" "$E2E_DOCKER_TIMEOUT_SECONDS" \
  builder_backend_wait_for_db "$E2E_DOCKER_TIMEOUT_SECONDS"

run_step "bootstrap database schema" "$E2E_MIGRATIONS_TIMEOUT_SECONDS" \
  bootstrap_database

wait_for_step "generate prisma client" "$generate_prisma_client_pid"

if [ "$E2E_RUN_TESTS" = "true" ]; then
  wait_for_step "install playwright chromium" "$install_playwright_chromium_pid"

  run_step "start e2e postgrest" "$E2E_DOCKER_TIMEOUT_SECONDS" \
    builder_backend_start_postgrest

  if [ "${E2E_BUILDER_URL:-}" = "" ]; then
    run_step "build builder app" "$E2E_BUILDER_BUILD_TIMEOUT_SECONDS" \
      build_builder_app
  fi

  run_step "run builder e2e tests" "$E2E_TEST_COMMAND_TIMEOUT_SECONDS" \
    pnpm --dir "$ROOT_DIR/apps/builder" exec tsx --env-file .env --env-file .env.development --conditions=webstudio ./e2e/run.ts
fi

TOTAL_DURATION_MS="$(($(now_ms) - RUN_STARTED_AT))"
echo "[e2e:perf] phase=total duration=${TOTAL_DURATION_MS}ms"
