#!/usr/bin/env bash

set -euo pipefail

ref_name="${1:?A git ref name is required}"
alias="${ref_name/.staging/}"
alias=$(echo "${alias}" | sed 's/[^a-zA-Z0-9_-]//g' | tr '[:upper:]_' '[:lower:]-' | sed 's/-\{2,\}/-/g')

# Project requests use p-<uuid>-dot-<alias>, which must fit in a 63-byte DNS label.
if (( ${#alias} > 20 )); then
  hash=$(printf '%s' "${alias}" | git hash-object --stdin | cut -c1-7)
  alias="${alias:0:12}-${hash}"
fi

printf '%s\n' "${alias}"
