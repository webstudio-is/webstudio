import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { VisualComparisonResult, VisualTestReport } from "./shared";

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const relativeAssetPath = (reportDirectory: string, file: string | undefined) =>
  file === undefined
    ? undefined
    : path.relative(reportDirectory, file).split(path.sep).join("/");

const renderTextChanges = (comparison: VisualComparisonResult) => {
  const changes = comparison.textAnalysis?.changes ?? [];
  if (changes.length === 0) {
    return "";
  }
  return `<ul class="text-changes">${changes
    .map((change) => {
      const text =
        change.text ?? change.currentText ?? change.baselineText ?? "";
      return `<li><strong>${escapeHtml(change.kind.replaceAll("_", " "))}</strong>${text === "" ? "" : `: ${escapeHtml(text)}`}</li>`;
    })
    .join("")}</ul>`;
};

const renderComparison = (
  reportDirectory: string,
  comparison: VisualComparisonResult
) => {
  const baseline = relativeAssetPath(reportDirectory, comparison.baselinePath);
  const current = relativeAssetPath(reportDirectory, comparison.currentPath);
  const diff = relativeAssetPath(reportDirectory, comparison.diffPath);
  const images = [
    baseline === undefined
      ? ""
      : `<figure><figcaption>Baseline</figcaption><img src="${escapeHtml(baseline)}" alt="Baseline for ${escapeHtml(comparison.title)} ${escapeHtml(comparison.name)}"></figure>`,
    current === undefined
      ? ""
      : `<figure><figcaption>Current</figcaption><img src="${escapeHtml(current)}" alt="Current rendering for ${escapeHtml(comparison.title)} ${escapeHtml(comparison.name)}"></figure>`,
    diff === undefined
      ? ""
      : `<figure><figcaption>Diff</figcaption><img src="${escapeHtml(diff)}" alt="Visual difference for ${escapeHtml(comparison.title)} ${escapeHtml(comparison.name)}"></figure>`,
  ].join("");
  const metrics =
    comparison.mismatchPercentage === undefined
      ? ""
      : `<span>${comparison.differentPixels?.toLocaleString() ?? 0} pixels · ${comparison.mismatchPercentage.toFixed(4)}%</span>`;
  return `<article class="comparison ${comparison.status}">
    <header><div><h2>${escapeHtml(comparison.title)} › ${escapeHtml(comparison.name)}</h2><code>${escapeHtml(comparison.id)}</code></div><div><span class="status">${comparison.status}</span>${metrics}</div></header>
    ${comparison.error === undefined ? "" : `<pre>${escapeHtml(comparison.error)}</pre>`}
    ${renderTextChanges(comparison)}
    <div class="images">${images}</div>
  </article>`;
};

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
  await writeFile(
    path.join(reportDirectory, "report.json"),
    `${JSON.stringify(portableReport, undefined, 2)}\n`
  );
  const counts = Object.groupBy(report.comparisons, ({ status }) => status);
  const important = report.comparisons.filter(
    ({ status }) => status !== "unchanged"
  );
  const html = `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Webstudio visual comparison</title>
<style>
:root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: #f6f6f6; color: #181818; }
body { margin: 0; padding: 32px; } main { max-width: 1600px; margin: auto; }
h1 { margin: 0 0 8px; } .summary { display: flex; gap: 12px; flex-wrap: wrap; margin: 24px 0; }
.summary span, .status { border-radius: 999px; background: #e7e7e7; padding: 4px 10px; }
.comparison { background: white; border: 1px solid #ddd; border-radius: 12px; margin: 20px 0; overflow: hidden; }
.comparison > header { align-items: flex-start; display: flex; justify-content: space-between; gap: 16px; padding: 18px; }
.comparison h2 { font-size: 17px; margin: 0 0 5px; }.comparison header > div:last-child { align-items: flex-end; display: flex; flex-direction: column; gap: 8px; }
.changed .status, .added .status, .removed .status { background: #ffe39c; }.error .status { background: #ffc4c4; }
.images { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); border-top: 1px solid #ddd; }
figure { margin: 0; min-width: 0; padding: 12px; border-right: 1px solid #ddd; } figcaption { font-weight: 600; margin-bottom: 8px; }
img { display: block; max-width: 100%; border: 1px solid #eee; } pre { overflow: auto; padding: 18px; color: #a40000; }.text-changes { margin: 0 18px 18px; }
</style></head><body><main><h1>Visual comparison</h1>
<p><code>${escapeHtml(report.baselineCommit)}</code> → <code>${escapeHtml(report.currentCommit)}</code> in ${(report.durationMs / 1000).toFixed(1)}s</p>
<div class="summary">${["changed", "added", "removed", "error", "unchanged"]
    .map(
      (status) =>
        `<span>${status}: ${counts[status as keyof typeof counts]?.length ?? 0}</span>`
    )
    .join("")}</div>
${report.errors.map((error) => `<pre>${escapeHtml(error)}</pre>`).join("")}
${important.length === 0 ? "<p>No visual differences detected.</p>" : important.map((comparison) => renderComparison(reportDirectory, comparison)).join("")}
</main></body></html>`;
  await writeFile(path.join(reportDirectory, "index.html"), html);
};
