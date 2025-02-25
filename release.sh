#!/bin/bash

# Function to display error messages and exit
error_exit() {
    echo "ERROR: $1" >&2
    exit 1
}

# Parse command line arguments
DRY_RUN=false
while getopts "d" opt; do
    case $opt in
        d) DRY_RUN=true ;;
        *) error_exit "Usage: $0 [-d]" ;;
    esac
done

# Function to execute or simulate a command
run_cmd() {
    if [ "$DRY_RUN" = true ]; then
        echo "DRY RUN: Would execute: $*"
    else
        echo "Executing: $*"
        eval "$@" || error_exit "Command failed: $*"
    fi
}

# Exit immediately if a command exits with a non-zero status (unless in dry run)
if [ "$DRY_RUN" = false ]; then
    set -e
fi

echo "Mode: $([ "$DRY_RUN" = true ] && echo "DRY RUN (no changes will be made)" || echo "LIVE RUN")"

# 1. Check if on main branch for main repo (process is for debugging)
current_branch=$(git branch --show-current)
if [ "$current_branch" != "main" ] && [ "$current_branch" != "process" ]; then
    error_exit "You are not on the main branch. Please switch to main branch first."
fi

# 2. Check for uncommitted changes or untracked files in main repo
if [ -n "$(git status --porcelain)" ]; then
    error_exit "You have uncommitted changes or untracked files. Please commit or stash them first."
fi

# 3. Prepare release branch name with today's date
today=$(date +"%d-%m-%Y")
release_branch="release-${today}.staging"

# 4. Check all submodules before making any changes
echo "Verifying all submodules are ready..."

git submodule foreach --recursive '
    # Check if submodule is on main branch
    submodule_branch=$(git branch --show-current)
    if [ "$submodule_branch" != "main" ]; then
        echo "ERROR: Submodule $name is not on main branch. Current branch: $submodule_branch" >&2
        exit 1
    fi

    # Check for uncommitted changes in submodule
    if [ -n "$(git status --porcelain)" ]; then
        echo "ERROR: Uncommitted changes in submodule $name." >&2
        exit 1
    fi

    echo "Submodule $name verification passed."
' || error_exit "Submodule verification failed."

# 5. If we've reached here, all checks passed, now make the changes
echo "All checks passed. Creating release branches..."

# Create the branch in main repo
echo "Creating release branch in main repository: $release_branch"
run_cmd "git checkout -b \"$release_branch\""

# Create an empty commit with release message
commit_date=$(date +"%d-%m-%Y")
run_cmd "git commit --allow-empty -m \"build: Release ${commit_date}\""

# 6. Create branches in all submodules and push them
echo "Creating and pushing branches in submodules..."

# Create a function for submodule operations that supports dry run
submodule_operations() {
    local dry_run="$1"
    local release_br="$2"

    # Create the same branch in the submodule
    if [ "$dry_run" = true ]; then
        echo "DRY RUN: Would execute in submodule $name: git checkout -b $release_br"
        echo "DRY RUN: Would execute in submodule $name: git push -u origin $release_br"
    else
        git checkout -b "$release_br" || { echo "ERROR: Failed to create branch in submodule $name." >&2; exit 1; }
        git push -u origin "$release_br" || { echo "ERROR: Failed to push branch for submodule $name." >&2; exit 1; }
    fi
    echo "$([ "$dry_run" = true ] && echo "DRY RUN: Would have" || echo "Successfully") created and pushed branch for submodule $name"
}

# Export the function and variables so they can be used in submodule foreach
export -f submodule_operations
export DRY_RUN
export release_branch

git submodule foreach --recursive 'bash -c "submodule_operations \"$DRY_RUN\" \"$release_branch\""'

# 7. Success message
echo ""
if [ "$DRY_RUN" = true ]; then
    echo "DRY RUN COMPLETE. No changes were made."
    echo "To create the release branch for real, run without the -d flag."
else
    echo "Success! Release branch $release_branch is ready."
    echo "You can now push it to the remote with:"
    echo "git push -u origin $release_branch"
fi
