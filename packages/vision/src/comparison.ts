export type VisualEntry = {
  id: string;
};

export type VisualComparison<Entry extends VisualEntry = VisualEntry> = {
  id: string;
  status: "added" | "removed" | "comparable";
  baseline: Entry | undefined;
  current: Entry | undefined;
};

export const getVisualComparisons = <Entry extends VisualEntry>({
  baselineEntries,
  currentEntries,
}: {
  baselineEntries: Record<string, Entry>;
  currentEntries: Record<string, Entry>;
}): VisualComparison<Entry>[] => {
  const ids = new Set([
    ...Object.keys(baselineEntries),
    ...Object.keys(currentEntries),
  ]);

  return [...ids].sort().map((id) => {
    const baseline = baselineEntries[id];
    const current = currentEntries[id];
    if (baseline === undefined) {
      return { id, status: "added", baseline, current };
    }
    if (current === undefined) {
      return { id, status: "removed", baseline, current };
    }
    return { id, status: "comparable", baseline, current };
  });
};
