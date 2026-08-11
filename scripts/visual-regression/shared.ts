import {
  classifyScreenshotComparisonReport,
  type ScreenshotComparisonReport,
} from "@webstudio-is/vision/report";

export const classifyVisualTestRun = ({
  report,
  approved,
}: {
  report: ScreenshotComparisonReport;
  approved: boolean;
}): "passed" | "visual-differences" | "approved" | "test-failure" => {
  const result = classifyScreenshotComparisonReport(report);
  if (result === "failure") {
    return "test-failure";
  }
  if (result === "passed") {
    return "passed";
  }
  return approved ? "approved" : "visual-differences";
};
