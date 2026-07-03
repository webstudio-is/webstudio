#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
COMPOSE_OVERRIDE_FILE="$ROOT_DIR/apps/builder/docker-compose.local.yaml"
source "$ROOT_DIR/apps/builder/dev/backend.sh"
builder_backend_init

cleanup() {
  if [ "${LOCAL_DEV_CLEANUP:-${LOCAL_DEV_START_BUILDER:-true}}" != "true" ]; then
    return
  fi

  local down_args=(--remove-orphans)
  if [ "${LOCAL_DEV_CLEANUP_VOLUMES:-false}" = "true" ]; then
    down_args+=(--volumes)
  fi
  builder_backend_down "${down_args[@]}"
}

trap cleanup EXIT

if [ "${LOCAL_DEV_RESET_DB:-false}" = "true" ]; then
  builder_backend_down --volumes --remove-orphans
fi

builder_backend_start_db
builder_backend_wait_for_db
builder_backend_bootstrap_if_empty
builder_generate_prisma_client auto
builder_backend_start_postgrest
builder_backend_wait_for_postgrest

if [ "${LOCAL_DEV_START_BUILDER:-true}" = "true" ]; then
  pnpm --dir "$ROOT_DIR" --filter=@webstudio-is/builder dev
fi
