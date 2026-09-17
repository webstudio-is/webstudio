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
    # Keep the commit recorded by the superproject when no matching branch exists.
    # Checking out main here changes the submodule gitlink and makes otherwise
    # clean workflows (for example fixture tests) appear to have modifications.
    echo "Branch \"$SUBMODULE_BRANCH\" does not exist; keeping the recorded submodule commit"
  fi
'
