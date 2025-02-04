#!/bin/bash

BRANCH="$1"

find . -type l -not -path "*/node_modules/*" -name "private-*" -exec rm {} +

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


# SymLink creation

# Example Input:
# private/
# ├── packages/
# │   ├── sdk-components-animation/
# │   │   ├── private-src/
# │   │   │   ├── some-other-folders/
#
# ./
# ├── packages/
# │   ├── sdk-components-animation/

# Step 1. Identify common directories between `private/` and `./`
# Result:
# Common directories found: (comm -12)
# - packages/
# - packages/sdk-components-animation/
#
# Step 2. For each common directory, check subfolders inside `private/COMMON_DIR/`.
# If a subfolder inside `private/COMMON_DIR/` does not exist inside `./COMMON_DIR/`,
# create a symlink at `./COMMON_DIR/SUBFOLDER -> private/COMMON_DIR/SUBFOLDER
# Result:
# Symlink created packages/sdk-components-animation/private-src/ -> private/packages/sdk-components-animation/private-src/


PRIVATE_DIR="./private"
DESTINATION_DIR="."

# Get common directories
COMMON_DIRS=$(comm -12 <( \
find private/* -not -path "*/node_modules/*" -type d | sed "s|^private/||" | sort \
) <( \
find ./* -not -name "node_modules" -not -name "private" -not -path "*/node_modules/*" -not -path "*/private/*" -type d | sed "s|^\.*/||" | sort \
))


# Create symlinks for each common directory
# Iterate over each common directory
while IFS= read -r DIR; do
  # Get subfolders inside PRIVATE_DIR/DIR
  for SUBFOLDER in "$PRIVATE_DIR/$DIR"/*/; do

    # Ensure SUBFOLDER exists (to avoid glob expansion issues)
    [ -d "$SUBFOLDER" ] || continue

    # Extract relative subfolder name
    SUBFOLDER_NAME=$(basename "$SUBFOLDER")

    # Destination path
    DEST_PATH="$DESTINATION_DIR/$DIR/$SUBFOLDER_NAME"

    # If the subfolder does not exist at the destination, create a symlink
    if [ ! -e "$DEST_PATH" ]; then
      ln -s "$(realpath "$SUBFOLDER")" "$DEST_PATH"
      echo "Linked: $DEST_PATH -> $(realpath "$SUBFOLDER")"
    fi
  done
done <<< "$COMMON_DIRS"