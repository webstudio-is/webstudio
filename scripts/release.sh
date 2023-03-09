#!/bin/bash

# This script is used to build the release version of the WebStudio Builder.
# It is called by the build.sh script.

if [ $1 ]; then
    find apps/builder -name package.json -exec sed -i "s/\"version\": \".*\"/\"version\": \"$1\"/g" {} \;
    find packages -not -path "*eslint-config-custom*" -not -path "*feature-flags*" -not -path "*jest-config*" -not -path "*scripts*" -not -path "*sdk-size-test*" -not -path "*storybook-config*" -not -path "*tsconfig*" -name package.json -exec sed -i "s/\"version\": \".*\"/\"version\": \"$1\"/g" {} \;
else
    echo "No version specified. Execute like bash scripts/release.sh 0.42.0"
    exit 1
fi
