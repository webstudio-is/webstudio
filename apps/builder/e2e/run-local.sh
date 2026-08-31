#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
COMPOSE_OVERRIDE_FILE="${E2E_COMPOSE_OVERRIDE_FILE:-$ROOT_DIR/apps/builder/docker-compose.e2e.yaml}"
PLAYWRIGHT_ARGS=("$@")
if [ "${PLAYWRIGHT_ARGS[0]:-}" = "--" ]; then
  PLAYWRIGHT_ARGS=("${PLAYWRIGHT_ARGS[@]:1}")
fi

# Keep the disposable E2E backend independent from the persistent local
# development backend. In particular, E2E cleanup must never remove the local
# database volume.
export COMPOSE_PROJECT_NAME="${E2E_COMPOSE_PROJECT_NAME:-builder-e2e}"
export PGPORT="${E2E_PGPORT:-55434}"
export POSTGREST_PORT="${E2E_POSTGREST_PORT:-55435}"
export POSTGRES_DB="${E2E_POSTGRES_DB:-webstudio}"
# The Supabase image owns the schema as this required bootstrap role. Callers
# can still replace migration connections through E2E_DATABASE_URL and
# E2E_DIRECT_URL.
export POSTGRES_USER="supabase_admin"
export POSTGRES_PASSWORD="${E2E_POSTGRES_PASSWORD:-pass}"
export DATABASE_URL="${E2E_DATABASE_URL:-postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${PGPORT}/${POSTGRES_DB}?pgbouncer=true}"
export DIRECT_URL="${E2E_DIRECT_URL:-postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${PGPORT}/${POSTGRES_DB}}"
export POSTGREST_URL="${E2E_POSTGREST_URL:-http://localhost:${POSTGREST_PORT}}"

source "$ROOT_DIR/apps/builder/dev/backend.sh"
source "$ROOT_DIR/apps/builder/e2e/run-step.sh"
builder_backend_init

export E2E_DB_BOOTSTRAP="${E2E_DB_BOOTSTRAP:-auto}"
export E2E_BUILD_DATABASE_IMAGE="${E2E_BUILD_DATABASE_IMAGE:-true}"
export E2E_GENERATE_PRISMA="${E2E_GENERATE_PRISMA:-auto}"
export E2E_DOCKER_PULL_TIMEOUT_SECONDS="${E2E_DOCKER_PULL_TIMEOUT_SECONDS:-300}"
export E2E_DOCKER_TIMEOUT_SECONDS="${E2E_DOCKER_TIMEOUT_SECONDS:-60}"
export E2E_MIGRATIONS_TIMEOUT_SECONDS="${E2E_MIGRATIONS_TIMEOUT_SECONDS:-300}"
export E2E_INSTALL_PLAYWRIGHT="${E2E_INSTALL_PLAYWRIGHT:-auto}"
export E2E_PLAYWRIGHT_INSTALL_TIMEOUT_SECONDS="${E2E_PLAYWRIGHT_INSTALL_TIMEOUT_SECONDS:-600}"
export E2E_RUN_TESTS="${E2E_RUN_TESTS:-true}"
export E2E_START_POSTGREST="${E2E_START_POSTGREST:-$E2E_RUN_TESTS}"
export E2E_BUILDER_BUILD_TIMEOUT_SECONDS="${E2E_BUILDER_BUILD_TIMEOUT_SECONDS:-600}"
export E2E_TEST_COMMAND_TIMEOUT_SECONDS="${E2E_TEST_COMMAND_TIMEOUT_SECONDS:-900}"
export E2E_TEST_SELECTION_TIMEOUT_SECONDS="${E2E_TEST_SELECTION_TIMEOUT_SECONDS:-60}"
export E2E_WRITE_SCHEMA_SNAPSHOT="${E2E_WRITE_SCHEMA_SNAPSHOT:-false}"

cleanup() {
  if [ "${E2E_SKIP_CLEANUP:-}" = "true" ]; then
    return
  fi

  builder_backend_down --volumes --remove-orphans
}

trap cleanup EXIT

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
      const { chromium } = require("@playwright/test");
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
  pnpm --dir "$ROOT_DIR" e2e:builder:build
}

verify_e2e_apps_built() {
  local builder_server="$ROOT_DIR/apps/builder/build/server"
  local builder_assets="$ROOT_DIR/apps/builder/build/client/assets"

  if [ ! -d "$builder_server" ] || [ ! -d "$builder_assets" ]; then
    echo "E2E_SKIP_BUILDER_BUILD requires prebuilt Builder artifacts" >&2
    return 1
  fi
}

run_builder_e2e_tests() {
  (
    cd "$ROOT_DIR/apps/builder"
    if [ "${#PLAYWRIGHT_ARGS[@]}" -eq 0 ]; then
      pnpm e2e:ci
    else
      pnpm e2e:ci "${PLAYWRIGHT_ARGS[@]}"
    fi
  )
}

validate_builder_e2e_selection() {
  (
    cd "$ROOT_DIR/apps/builder"
    E2E_BUILDER_URL="${E2E_BUILDER_URL:-https://127.0.0.1:3000}" \
      pnpm e2e:ci --list "${PLAYWRIGHT_ARGS[@]}"
  )
}

prepare_e2e_database_image() {
  if [ "$E2E_BUILD_DATABASE_IMAGE" = "true" ]; then
    builder_compose build --pull db
    return
  fi

  builder_backend_pull_db
}

if [ "$E2E_RUN_TESTS" = "true" ]; then
  run_step "validate builder e2e test selection" \
    "$E2E_TEST_SELECTION_TIMEOUT_SECONDS" validate_builder_e2e_selection
fi

run_step "prepare e2e database image" "$E2E_DOCKER_PULL_TIMEOUT_SECONDS" \
  prepare_e2e_database_image

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
    if [ "${E2E_SKIP_BUILDER_BUILD:-false}" = "true" ]; then
      run_step "verify prebuilt builder artifacts" "$E2E_BUILDER_BUILD_TIMEOUT_SECONDS" \
        verify_e2e_apps_built
    else
      run_step "build builder and generated preview dependencies" "$E2E_BUILDER_BUILD_TIMEOUT_SECONDS" \
        build_e2e_apps
    fi
  fi

  run_step "run builder e2e tests" "$E2E_TEST_COMMAND_TIMEOUT_SECONDS" \
    run_builder_e2e_tests
fi
