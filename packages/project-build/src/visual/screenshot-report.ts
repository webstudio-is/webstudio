import { spawn } from "node:child_process";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ScreenshotDiffRegion } from "./screenshot-diff";
import type { ScreenshotTextAnalysis } from "./screenshot-text-diff";

export type ScreenshotComparisonReportItem = {
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

export type ScreenshotComparisonReport = {
  baselineLabel: string;
  currentLabel: string;
  durationMs: number;
  comparisons: readonly ScreenshotComparisonReportItem[];
  errors: readonly string[];
};

const reportDataMarker = "__VISUAL_REPORT_DATA__";

const relativeAssetPath = (reportDirectory: string, file: string | undefined) =>
  file === undefined
    ? undefined
    : path.relative(reportDirectory, file).split(path.sep).join("/");

const serializeEmbeddedJson = (value: unknown) =>
  JSON.stringify(value)
    .replaceAll("&", "\\u0026")
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");

export const writeScreenshotComparisonReport = async ({
  report,
  reportDirectory,
}: {
  report: ScreenshotComparisonReport;
  reportDirectory: string;
}) => {
  await mkdir(reportDirectory, { recursive: true });
  const portableReport = {
    ...report,
    comparisons: report.comparisons.map((comparison) => ({
      ...comparison,
      baselinePath: relativeAssetPath(reportDirectory, comparison.baselinePath),
      currentPath: relativeAssetPath(reportDirectory, comparison.currentPath),
      diffPath: relativeAssetPath(reportDirectory, comparison.diffPath),
      contextDiffPath: relativeAssetPath(
        reportDirectory,
        comparison.contextDiffPath
      ),
    })),
  };
  const template = await readFile(
    new URL("./screenshot-report.html", import.meta.url),
    "utf8"
  );
  if (template.includes(reportDataMarker) === false) {
    throw new Error(
      `Screenshot report template is missing ${reportDataMarker}.`
    );
  }
  await Promise.all([
    copyFile(
      new URL("./screenshot-report.css", import.meta.url),
      path.join(reportDirectory, "report.css")
    ),
    copyFile(
      new URL("./screenshot-report-client.js", import.meta.url),
      path.join(reportDirectory, "report.js")
    ),
    writeFile(
      path.join(reportDirectory, "report.json"),
      `${JSON.stringify(portableReport, undefined, 2)}\n`
    ),
    writeFile(
      path.join(reportDirectory, "index.html"),
      template.replace(reportDataMarker, serializeEmbeddedJson(portableReport))
    ),
  ]);
};

export const openScreenshotComparisonReport = (reportPath: string) => {
  const command =
    process.platform === "darwin"
      ? { file: "open", args: [reportPath] }
      : process.platform === "win32"
        ? { file: "cmd", args: ["/c", "start", "", reportPath] }
        : { file: "xdg-open", args: [reportPath] };

  const child = spawn(command.file, command.args, {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
};
