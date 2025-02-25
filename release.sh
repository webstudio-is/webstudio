#!/bin/bash

#
# Release Branch Creator Script
# -----------------------------
#
# DESCRIPTION:
#   This script automates the process of creating release branches in a Git repository
#   with submodules. It creates a release branch with the current date in the format
#   'release-DD-MM-YYYY.staging' in both the main repository and all its submodules.
#
# FEATURES:
#   - Verifies you're on main/master branch before proceeding
#   - Checks for uncommitted changes in main repo and submodules
#   - Creates a release branch with today's date
#   - Creates an empty commit in the main repo with message "build: Release DD-MM-YYYY"
#   - Creates matching branches in all submodules
#   - Pushes submodule branches to their remotes
#   - Provides a dry run mode (-d flag) to preview actions without making changes
#
# USAGE:
#   ./release-branch-script.sh         # Create and push release branches
#   ./release-branch-script.sh -d      # Dry run (show what would happen without making changes)
#
# REQUIREMENTS:
#   - All repositories (main and submodules) must be on main/master branch
#   - No uncommitted changes anywhere
#   - Git must be installed and properly configured
#

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
    error_exit "You are not on the main or master branch. Please switch to main or master branch first."
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
    # Check if submodule is on main or master branch
    submodule_branch=$(git branch --show-current)
    if [ "$submodule_branch" != "main" ] && [ "$submodule_branch" != "master" ]; then
        echo "ERROR: Submodule $name is not on main or master branch. Current branch: $submodule_branch" >&2
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

# Instead of using a function, directly execute commands in each submodule
if [ "$DRY_RUN" = true ]; then
    git submodule foreach --recursive "echo \"DRY RUN: Would execute in submodule \$name: git checkout -b $release_branch\""
    git submodule foreach --recursive "echo \"DRY RUN: Would execute in submodule \$name: git push -u origin $release_branch\""
    git submodule foreach --recursive "echo \"DRY RUN: Would have created and pushed branch for submodule \$name\""
else
    git submodule foreach --recursive "
        git checkout -b \"$release_branch\" || { echo \"ERROR: Failed to create branch in submodule \$name.\" >&2; exit 1; }
        git push -u origin \"$release_branch\" || { echo \"ERROR: Failed to push branch for submodule \$name.\" >&2; exit 1; }
        echo \"Successfully created and pushed branch for submodule \$name\"
    " || error_exit "Failed to create or push branches in one or more submodules."
fi

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