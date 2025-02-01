#!/bin/bash

BRANCH="$1"


git submodule update --init --recursive

git submodule foreach '
  # If a branch parameter is provided, use it; otherwise, determine the branch dynamically
  if [ -n "'"$BRANCH"'" ]; then
    SUBMODULE_BRANCH="'"$BRANCH"'"
  else
    SUBMODULE_BRANCH=$(git -C $toplevel rev-parse --abbrev-ref HEAD)
  fi

  echo "Checking out \"$SUBMODULE_BRANCH\" branch in \"$name\" submodule"

  # Check if the branch exists in the remote
  if git ls-remote --exit-code --heads origin "$SUBMODULE_BRANCH" > /dev/null; then
    git checkout "$SUBMODULE_BRANCH" && git pull origin "$SUBMODULE_BRANCH"
  else
    # Fallback to "main" if the branch does not exist
    git checkout "main" && git pull origin "main"
  fi
'