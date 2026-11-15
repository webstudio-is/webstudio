#!/usr/bin/env bash
set -euo pipefail

{
  # Keep test exclusions scoped so Remix routes and public assets are still hashed.
  git ls-files -s -- . ':!apps/builder/e2e/**' \
    ':(exclude,glob)apps/builder/app/'{builder,canvas,dashboard,services,shared}'/**/*.'{test,spec}.{ts,tsx} \
    ':(exclude,glob)apps/builder/backend/**/*.'{test,spec}.{ts,tsx} \
    ':(exclude,glob)packages/*/'{src,scripts,evaluations,migrations-cli}'/**/*.'{test,spec}.{ts,tsx} \
    ':(exclude,glob)scripts/visual-regression/**/*.'{test,spec}.{ts,tsx}

  # CI can check out a submodule branch newer than the recorded gitlink.
  git submodule foreach --quiet --recursive 'head=$(git rev-parse HEAD) && printf "%s %s\n" "$displaypath" "$head"'
} | sha256sum | cut -d' ' -f1
