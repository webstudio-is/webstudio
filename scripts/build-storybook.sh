#!/bin/bash

# This script is used to build storybook for a specific package.

if [ $1 ]; then
    pnpm turbo run storybook:build --filter=@webstudio-is/$1
else
    echo "No filter specified. Execute like bash scripts/storybook-builder.sh <filter>"
    exit 1
fi
