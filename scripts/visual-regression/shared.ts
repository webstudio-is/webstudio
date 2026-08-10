export const VISUAL_DIFFERENCE_MARKER = "VISUAL_DIFFERENCE";

export type StoryEntry = {
  id: string;
  title: string;
  name: string;
};

type StoryComparison = {
  id: string;
  status: "added" | "removed" | "comparable";
  baseline: StoryEntry | undefined;
  current: StoryEntry | undefined;
};

export const getStoryComparisons = ({
  baselineEntries,
  currentEntries,
}: {
  baselineEntries: Record<string, StoryEntry>;
  currentEntries: Record<string, StoryEntry>;
}): StoryComparison[] => {
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

type JsonTestResult = {
  status?: string;
  errors?: Array<{ message?: string }>;
};

const getFailedResults = (value: unknown): JsonTestResult[] => {
  if (Array.isArray(value)) {
    return value.flatMap(getFailedResults);
  }
  if (typeof value !== "object" || value === null) {
    return [];
  }

  const object = value as Record<string, unknown>;
  const ownResults = Array.isArray(object.results)
    ? object.results.filter(
        (result): result is JsonTestResult =>
          typeof result === "object" &&
          result !== null &&
          "status" in result &&
          result.status !== "passed" &&
          result.status !== "skipped"
      )
    : [];

  return [
    ...ownResults,
    ...Object.entries(object)
      .filter(([key]) => key !== "results")
      .flatMap(([, child]) => getFailedResults(child)),
  ];
};

export const classifyVisualTestRun = ({
  report,
  approved,
}: {
  report: unknown;
  approved: boolean;
}): "passed" | "visual-differences" | "approved" | "test-failure" => {
  if (
    typeof report === "object" &&
    report !== null &&
    "errors" in report &&
    Array.isArray(report.errors) &&
    report.errors.length > 0
  ) {
    return "test-failure";
  }

  const failures = getFailedResults(report);
  if (failures.length === 0) {
    return "passed";
  }

  const hasOnlyVisualDifferences = failures.every(
    (result) =>
      result.errors !== undefined &&
      result.errors.length > 0 &&
      result.errors.every((error) =>
        error.message?.includes(VISUAL_DIFFERENCE_MARKER)
      )
  );
  if (hasOnlyVisualDifferences === false) {
    return "test-failure";
  }
  return approved ? "approved" : "visual-differences";
};
