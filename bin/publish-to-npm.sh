#!/usr/bin/env bash

set -eou pipefail

PKG_VERSION=$(cat package.json | jq -r .version)
NPM_VERSION=$(npm view $npm_package_name version || echo NOT_FOUND)

echo Current $npm_package_name $NPM_VERSION

if [[ $PKG_VERSION != $NPM_VERSION ]]; then
  echo Publishing $npm_package_name $PKG_VERSION
  # even though `npm` is used here this bash script gets invoked through `yarn`
  # yarn 1 provides an env variable overriding the default npm registry with their own proxy
  # to keep the authentication working we need to override the registry url since we only configure the auth token for the default registry
  npm publish --access public --registry 'https://registry.npmjs.org/'
fi
