#!/usr/bin/env bash

run_step() {
  local name="$1"
  local timeout_seconds="$2"
  shift 2

  echo "▶ $name"
  local started_at
  started_at="$(date +%s)"

  # Monitor mode gives the background command its own process group. Killing
  # that group also stops descendants such as apt-get before a workflow retry.
  local restore_monitor_mode=false
  if [[ "$-" != *m* ]]; then
    set -m
    restore_monitor_mode=true
  fi
  "$@" </dev/null &
  local pid="$!"
  if [ "$restore_monitor_mode" = "true" ]; then
    set +m
  fi

  local timeout_at
  timeout_at="$(($(date +%s) + timeout_seconds))"
  while kill -0 "$pid" 2>/dev/null; do
    if [ "$(date +%s)" -ge "$timeout_at" ]; then
      echo "Timed out after ${timeout_seconds}s: $name" >&2
      kill -TERM -- "-$pid" 2>/dev/null || true
      sleep "${RUN_STEP_TERMINATION_GRACE_SECONDS:-10}"
      kill -KILL -- "-$pid" 2>/dev/null || true
      wait "$pid" || true
      return 124
    fi
    sleep 0.1
  done
  local status=0
  wait "$pid" || status="$?"
  if [ "$status" -ne 0 ]; then
    local duration
    duration="$(($(date +%s) - started_at))"
    echo "✗ $name (${duration}s)" >&2
    return "$status"
  fi
  local duration
  duration="$(($(date +%s) - started_at))"
  echo "✓ $name (${duration}s)"
}
