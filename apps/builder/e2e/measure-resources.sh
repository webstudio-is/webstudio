#!/usr/bin/env bash
set -euo pipefail

samples="$(mktemp)"
trap 'rm -f "$samples"' EXIT

read_metric() {
  local file="$1"
  local key="$2"
  if [ -r "$file" ]; then
    awk -v key="$key" '$1 == key { print $2; exit }' "$file"
  fi
}

read_pressure() {
  local file="$1"
  if [ -r "$file" ]; then
    awk '$1 == "some" { for (i = 2; i <= NF; i++) if ($i ~ /^total=/) { sub(/^total=/, "", $i); print $i; exit } }' "$file"
  fi
}

sample() {
  local cpu_usage cpu_pressure memory_usage memory_pressure oom
  cpu_usage="$(read_metric /sys/fs/cgroup/cpu.stat usage_usec)"
  cpu_pressure="$(read_pressure /sys/fs/cgroup/cpu.pressure)"
  memory_usage="$(cat /sys/fs/cgroup/memory.current 2>/dev/null || true)"
  memory_pressure="$(read_pressure /sys/fs/cgroup/memory.pressure)"
  oom="$(read_metric /sys/fs/cgroup/memory.events oom)"
  printf '%s\t%s\t%s\t%s\t%s\t%s\n' \
    "$(date +%s%N)" "$cpu_usage" "$cpu_pressure" \
    "$memory_usage" "$memory_pressure" "$oom" >> "$samples"
}

printf '[e2e:resources] logical_cpus=%s cpu_quota=%s memory_limit=%s\n' \
  "$(nproc 2>/dev/null || true)" \
  "$(cat /sys/fs/cgroup/cpu.max 2>/dev/null || true)" \
  "$(cat /sys/fs/cgroup/memory.max 2>/dev/null || true)"

sample
(
  while true; do
    sleep 2
    sample
  done
) &
sampler_pid=$!

if "$@"; then
  result=0
else
  result=$?
fi

kill "$sampler_pid" 2>/dev/null || true
wait "$sampler_pid" 2>/dev/null || true
sample

python3 - "$samples" <<'PY'
import sys

rows = []
for line in open(sys.argv[1]):
    values = line.rstrip("\n").split("\t")
    if len(values) != 6:
        continue
    rows.append([int(value) if value.isdigit() else None for value in values])

if len(rows) >= 2:
    elapsed = (rows[-1][0] - rows[0][0]) / 1_000_000_000
    def delta(index):
        first, last = rows[0][index], rows[-1][index]
        return None if first is None or last is None else last - first
    def pressure(index):
        change = delta(index)
        return "unavailable" if change is None else f"{change / 10_000 / elapsed:.1f}%"
    cpu = delta(1)
    memory = [row[3] for row in rows if row[3] is not None]
    print(
        "[e2e:resources] "
        f"elapsed={elapsed:.1f}s "
        f"cpu_cores_avg={'unavailable' if cpu is None else f'{cpu / 1_000_000 / elapsed:.2f}'} "
        f"cpu_pressure={pressure(2)} "
        f"memory_peak_gib={'unavailable' if not memory else f'{max(memory) / 2**30:.2f}'} "
        f"memory_pressure={pressure(4)} "
        f"oom_events={delta(5)}"
    )
PY

exit "$result"
