export type VisualEntry = {
  id: string;
};

export type VisualComparison<Entry extends VisualEntry = VisualEntry> = {
  id: string;
  status: "added" | "removed" | "comparable";
  baseline: Entry | undefined;
  current: Entry | undefined;
};

const indexVisualEntries = <Entry extends VisualEntry>(
  entries: readonly Entry[],
  label: "baseline" | "current"
) => {
  const indexed = new Map<string, Entry>();
  for (const entry of entries) {
    if (indexed.has(entry.id)) {
      throw new Error(
        `Duplicate ${label} visual entry id: ${JSON.stringify(entry.id)}`
      );
    }
    indexed.set(entry.id, entry);
  }
  return indexed;
};

export const getVisualComparisons = <Entry extends VisualEntry>({
  baselineEntries,
  currentEntries,
}: {
  baselineEntries: readonly Entry[];
  currentEntries: readonly Entry[];
}): VisualComparison<Entry>[] => {
  const baselineById = indexVisualEntries(baselineEntries, "baseline");
  const currentById = indexVisualEntries(currentEntries, "current");
  const ids = new Set([...baselineById.keys(), ...currentById.keys()]);

  return [...ids].sort().map((id) => {
    const baseline = baselineById.get(id);
    const current = currentById.get(id);
    if (baseline === undefined) {
      return { id, status: "added", baseline, current };
    }
    if (current === undefined) {
      return { id, status: "removed", baseline, current };
    }
    return { id, status: "comparable", baseline, current };
  });
};
