#!/bin/bash


set -euo pipefail

echo "Removing dependency, build, and cache directories..."

find . -name 'node_modules' -type d -prune -exec rm -rf '{}' +
find . -name 'lib' -type d -prune -exec rm -rf '{}' +
find . -name 'build' -type d -prune -exec rm -rf '{}' +
find . -name 'dist' -type d -prune -exec rm -rf '{}' +
find . -name '.vite' -type d -prune -exec rm -rf '{}' +
find . -name '.cache' -type d -prune -exec rm -rf '{}' +
find . -name '.pnpm-store' -type d -prune -exec rm -rf '{}' +
find . -name '.eslintcache' -type f -delete
find . -name '*.tsbuildinfo' -type f -delete

echo "Cleanup completed."