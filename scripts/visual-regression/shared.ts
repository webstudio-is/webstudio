import type { ScreenshotComparisonReport } from "@webstudio-is/vision/report";

export const classifyVisualTestRun = ({
  report,
  approved,
}: {
  report: ScreenshotComparisonReport;
  approved: boolean;
}): "passed" | "visual-differences" | "approved" | "test-failure" => {
  if (
    report.errors.length > 0 ||
    report.comparisons.length === 0 ||
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
