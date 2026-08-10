import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { VisualTestReport } from "./shared";

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

export const writeVisualReport = async ({
  report,
  reportDirectory,
}: {
  report: VisualTestReport;
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
    new URL("./report-template.html", import.meta.url),
    "utf8"
  );
  if (template.includes(reportDataMarker) === false) {
    throw new Error(`Visual report template is missing ${reportDataMarker}.`);
  }
  await Promise.all([
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
