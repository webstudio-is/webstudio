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
export E2E_START_POSTGREST="${E2E_START_POSTGREST:-$E2E_RUN_TESTS}"
export E2E_BUILDER_BUILD_TIMEOUT_SECONDS="${E2E_BUILDER_BUILD_TIMEOUT_SECONDS:-600}"
export E2E_TEST_COMMAND_TIMEOUT_SECONDS="${E2E_TEST_COMMAND_TIMEOUT_SECONDS:-900}"
export E2E_WRITE_SCHEMA_SNAPSHOT="${E2E_WRITE_SCHEMA_SNAPSHOT:-false}"

cleanup() {
  if [ "${E2E_SKIP_CLEANUP:-}" = "true" ]; then
    return
  fi

  builder_backend_down --volumes --remove-orphans
}

trap cleanup EXIT

run_step() {
  local name="$1"
  local timeout_seconds="$2"
  shift 2

  echo "▶ $name"
  local started_at
  started_at="$(date +%s)"
  "$@" &
  local pid="$!"
  local timeout_at
  timeout_at="$(($(date +%s) + timeout_seconds))"
  while kill -0 "$pid" 2>/dev/null; do
    if [ "$(date +%s)" -ge "$timeout_at" ]; then
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
    local duration
    duration="$(($(date +%s) - started_at))"
    echo "✗ $name (${duration}s)" >&2
    return "$status"
  fi
  local duration
  duration="$(($(date +%s) - started_at))"
  echo "✓ $name (${duration}s)"
}

bootstrap_database() {
  if [ "$E2E_DB_BOOTSTRAP" = "if-empty" ]; then
    builder_backend_bootstrap_if_empty
  else
    builder_backend_bootstrap "$E2E_DB_BOOTSTRAP"
  fi

  if [ "$E2E_WRITE_SCHEMA_SNAPSHOT" = "true" ]; then
    builder_backend_write_schema_snapshot
  fi
}

install_playwright_chromium() {
  chromium_executable_exists() {
    pnpm --dir "$ROOT_DIR" --filter=@webstudio-is/builder exec node -e '
      const { chromium } = require("playwright");
      const { existsSync } = require("node:fs");
      process.exit(existsSync(chromium.executablePath()) ? 0 : 1);
    ' >/dev/null 2>&1
  }

  case "$E2E_INSTALL_PLAYWRIGHT" in
    true)
      pnpm --dir "$ROOT_DIR" --filter=@webstudio-is/builder exec playwright install --with-deps chromium
      ;;
    auto)
      if chromium_executable_exists; then
        echo "Skipping Playwright Chromium install; cached executable already exists"
      else
        pnpm --dir "$ROOT_DIR" --filter=@webstudio-is/builder exec playwright install --with-deps chromium
      fi
      ;;
    false)
      echo "Skipping Playwright Chromium install"
      ;;
    *)
      echo "Unknown E2E_INSTALL_PLAYWRIGHT value: $E2E_INSTALL_PLAYWRIGHT" >&2
      exit 1
      ;;
  esac
}

build_e2e_apps() {
  pnpm --dir "$ROOT_DIR" --filter=@webstudio-is/builder build
  pnpm --dir "$ROOT_DIR" --filter=@webstudio-is/sdk-components-react-router build
}

run_builder_e2e_tests() {
  (
    cd "$ROOT_DIR/apps/builder"
    pnpm exec tsx --env-file .env --env-file-if-exists .env.development --conditions=webstudio ./e2e/run.ts
  )
}

validate_test_filter() {
  if [ "${E2E_TEST_FILTER:-}" = "" ] && [ "${E2E_TEST_FILTERS:-}" = "" ] && [ "${E2E_TEST_SHARD:-}" = "" ]; then
    return
  fi
  (
    cd "$ROOT_DIR/apps/builder"
    E2E_VALIDATE_TEST_FILTER_ONLY=true pnpm exec tsx --env-file .env --env-file-if-exists .env.development --conditions=webstudio ./e2e/run.ts
  )
}

if [ "$E2E_RUN_TESTS" = "true" ]; then
  run_step "validate e2e test filter" "$E2E_TEST_COMMAND_TIMEOUT_SECONDS" \
    validate_test_filter
fi

run_step "start e2e database" "$E2E_DOCKER_TIMEOUT_SECONDS" \
  builder_backend_start_db

run_step "generate prisma client" "$E2E_MIGRATIONS_TIMEOUT_SECONDS" \
  builder_generate_prisma_client "$E2E_GENERATE_PRISMA"

run_step "wait for e2e database" "$E2E_DOCKER_TIMEOUT_SECONDS" \
  builder_backend_wait_for_db "$E2E_DOCKER_TIMEOUT_SECONDS"

run_step "bootstrap database schema" "$E2E_MIGRATIONS_TIMEOUT_SECONDS" \
  bootstrap_database

if [ "$E2E_START_POSTGREST" = "true" ]; then
  run_step "start e2e postgrest" "$E2E_DOCKER_TIMEOUT_SECONDS" \
    builder_backend_start_postgrest
fi

if [ "$E2E_RUN_TESTS" = "true" ]; then
  run_step "install playwright chromium" "$E2E_PLAYWRIGHT_INSTALL_TIMEOUT_SECONDS" \
    install_playwright_chromium

  if [ "${E2E_BUILDER_URL:-}" = "" ]; then
    run_step "build builder and generated preview dependencies" "$E2E_BUILDER_BUILD_TIMEOUT_SECONDS" \
      build_e2e_apps
  fi

  run_step "run builder e2e tests" "$E2E_TEST_COMMAND_TIMEOUT_SECONDS" \
    run_builder_e2e_tests
fi
