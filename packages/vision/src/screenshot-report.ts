import { spawn } from "node:child_process";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ScreenshotDiffRegion } from "./screenshot-diff";
import {
  screenshotReportClient,
  screenshotReportCss,
  screenshotReportHtml,
} from "./screenshot-report-assets";
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

export type ScreenshotComparisonReportResult =
  | "passed"
  | "differences"
  | "failure";

export const classifyScreenshotComparisonReport = (
  report: ScreenshotComparisonReport
): ScreenshotComparisonReportResult => {
  if (
    report.errors.length > 0 ||
    report.comparisons.length === 0 ||
    report.comparisons.some(({ status }) => status === "error")
  ) {
    return "failure";
  }
  return report.comparisons.some(({ status }) => status !== "unchanged")
    ? "differences"
    : "passed";
};

const reportDataMarker = "__VISUAL_REPORT_DATA__";

const toPortablePath = (reportDirectory: string, file: string) =>
  path.relative(reportDirectory, file).split(path.sep).join("/");

const materializeAsset = async ({
  file,
  index,
  name,
  reportDirectory,
}: {
  file: string | undefined;
  index: number;
  name: string;
  reportDirectory: string;
}) => {
  if (file === undefined) {
    return;
  }
  const relativePath = path.relative(reportDirectory, file);
  if (
    relativePath !== "" &&
    path.isAbsolute(relativePath) === false &&
    relativePath.startsWith(`..${path.sep}`) === false
  ) {
    return toPortablePath(reportDirectory, file);
  }
  const extension = path.extname(file) || ".png";
  const destination = path.join(
    reportDirectory,
    "assets",
    "comparisons",
    String(index),
    `${name}${extension}`
  );
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(file, destination);
  return toPortablePath(reportDirectory, destination);
};

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
    comparisons: await Promise.all(
      report.comparisons.map(async (comparison, index) => ({
        ...comparison,
        baselinePath: await materializeAsset({
          file: comparison.baselinePath,
          index,
          name: "baseline",
          reportDirectory,
        }),
        currentPath: await materializeAsset({
          file: comparison.currentPath,
          index,
          name: "current",
          reportDirectory,
        }),
        diffPath: await materializeAsset({
          file: comparison.diffPath,
          index,
          name: "diff",
          reportDirectory,
        }),
        contextDiffPath: await materializeAsset({
          file: comparison.contextDiffPath,
          index,
          name: "context-diff",
          reportDirectory,
        }),
      }))
    ),
  };
  if (screenshotReportHtml.includes(reportDataMarker) === false) {
    throw new Error(
      `Screenshot report template is missing ${reportDataMarker}.`
    );
  }
  await Promise.all([
    writeFile(path.join(reportDirectory, "report.css"), screenshotReportCss),
    writeFile(path.join(reportDirectory, "report.js"), screenshotReportClient),
    writeFile(
      path.join(reportDirectory, "report.json"),
      `${JSON.stringify(portableReport, undefined, 2)}\n`
    ),
    writeFile(
      path.join(reportDirectory, "index.html"),
      screenshotReportHtml.replace(
        reportDataMarker,
        serializeEmbeddedJson(portableReport)
      )
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
