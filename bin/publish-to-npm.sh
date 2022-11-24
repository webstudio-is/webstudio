#!/usr/bin/env bash

set -eou pipefail

PKG_VERSION=$(cat package.json | jq -r .version)
NPM_VERSION=$(npm view $npm_package_name version || echo NOT_FOUND)

echo Current $npm_package_name $NPM_VERSION

if [[ $PKG_VERSION != $NPM_VERSION ]]; then
  echo Publishing $npm_package_name $PKG_VERSION
  npm publish --access public
fi
