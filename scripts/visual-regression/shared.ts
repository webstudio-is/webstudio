import type {
  ScreenshotDiffRegion,
  ScreenshotTextAnalysis,
} from "@webstudio-is/project-build/vision";

export type StoryEntry = {
  id: string;
  title: string;
  name: string;
};

export type StoryComparison = {
  id: string;
  status: "added" | "removed" | "comparable";
  baseline: StoryEntry | undefined;
  current: StoryEntry | undefined;
};

export type VisualComparisonResult = {
  id: string;
  title: string;
  name: string;
  status: "unchanged" | "changed" | "added" | "removed" | "error";
  baselinePath?: string;
  currentPath?: string;
  diffPath?: string;
  contextDiffPath?: string;
  differentPixels?: number;
  mismatchPercentage?: number;
  regions?: readonly ScreenshotDiffRegion[];
  textAnalysis?: ScreenshotTextAnalysis;
  warnings?: readonly string[];
  error?: string;
};

export type VisualTestReport = {
  baselineCommit: string;
  currentCommit: string;
  durationMs: number;
  comparisons: readonly VisualComparisonResult[];
  errors: readonly string[];
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

export const classifyVisualTestRun = ({
  report,
  approved,
}: {
  report: VisualTestReport;
  approved: boolean;
}): "passed" | "visual-differences" | "approved" | "test-failure" => {
  if (
    report.errors.length > 0 ||
    report.comparisons.some(({ status }) => status === "error")
  ) {
    return "test-failure";
  }
  const hasDifferences = report.comparisons.some(({ status }) =>
    ["changed", "added", "removed"].includes(status)
  );
  if (hasDifferences === false) {
    return "passed";
  }
  return approved ? "approved" : "visual-differences";
};
