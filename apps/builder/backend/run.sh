#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
mode="${1:?Usage: backend/run.sh <mode> <docker compose arguments...>}"
shift

source "$ROOT_DIR/apps/builder/backend/lib.sh"
builder_backend_init "$mode"
builder_compose "$@"
