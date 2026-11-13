import type {
  ScreenshotComparisonReport,
  ScreenshotComparisonReportItem,
} from "@webstudio-is/vision/report";

type VerificationEntry = { id: string; file: string };

export const getStoryPairs = <Entry extends VerificationEntry>({
  ids,
  baselineEntries,
  currentEntries,
}: {
  ids: readonly string[];
  baselineEntries: Readonly<Record<string, Entry>>;
  currentEntries: Readonly<Record<string, Entry>>;
}) =>
  ids.map((id) => {
    const baseline = baselineEntries[id];
    const current = currentEntries[id];
    if (baseline === undefined) {
      throw new Error(`Baseline manifest is missing story ${id}.`);
    }
    if (current === undefined) {
      throw new Error(`Current manifest is missing story ${id}.`);
    }
    if (baseline.id !== id) {
      throw new Error(
        `The baseline manifest entry for ${id} has id ${baseline.id}.`
      );
    }
    if (current.id !== id) {
      throw new Error(
        `The current manifest entry for ${id} has id ${current.id}.`
      );
    }
    return { baseline, current };
  });

export const getIsolatedVerificationServers = ({
  repositoryRoot,
  checkout,
  baselineBundleDirectory,
  currentBundleDirectory,
  baselinePort,
  currentPort,
  pairs,
}: {
  repositoryRoot: string;
  checkout: string;
  baselineBundleDirectory: string;
  currentBundleDirectory: string;
  baselinePort: number;
  currentPort: number;
  pairs: readonly {
    baseline: VerificationEntry;
    current: VerificationEntry;
  }[];
}) => [
  {
    root: checkout,
    port: baselinePort,
    outputDirectory: baselineBundleDirectory,
    storyFiles: pairs.map(({ baseline }) => baseline.file),
  },
  {
    root: repositoryRoot,
    port: currentPort,
    outputDirectory: currentBundleDirectory,
    storyFiles: pairs.map(({ current }) => current.file),
  },
];

type DiagnosticReportItem = ScreenshotComparisonReportItem & {
  file?: string;
};

type DiagnosticReport = Omit<ScreenshotComparisonReport, "comparisons"> & {
  comparisons: readonly DiagnosticReportItem[];
};

const formatArtifactPaths = (comparison: DiagnosticReportItem) => {
  const paths = [
    ["baseline", comparison.baselinePath],
    ["current", comparison.currentPath],
    ["diff", comparison.diffPath],
    ["contextDiff", comparison.contextDiffPath],
  ].flatMap(([name, file]) => (file === undefined ? [] : [`${name}=${file}`]));
  return paths.length === 0 ? undefined : `  artifacts: ${paths.join(" ")}`;
};

export const formatVisualRegressionDiagnostics = (
  report: DiagnosticReport
): string[] => {
  const lines: string[] = [];
  if (report.errors.length > 0) {
    lines.push("Visual regression infrastructure errors:");
    lines.push(...report.errors.map((error) => `- ${error}`));
  }
  const differences = report.comparisons.filter(
    ({ status }) => status !== "unchanged"
  );
  if (differences.length === 0) {
    return lines;
  }
  lines.push("Visual regression diagnostics:");
  for (const comparison of differences) {
    const file =
      comparison.file === undefined ? "" : ` file=${comparison.file}`;
    const metrics =
      comparison.differentPixels === undefined ||
      comparison.mismatchPercentage === undefined
        ? ""
        : `: ${comparison.differentPixels} pixels, ${comparison.mismatchPercentage.toFixed(4)}% mismatch`;
    lines.push(
      `- ${comparison.status} ${comparison.id} (${comparison.title} / ${comparison.name})${file}${metrics}`
    );
    if (comparison.error !== undefined) {
      lines.push(`  error: ${comparison.error}`);
    }
    if (comparison.regions !== undefined && comparison.regions.length > 0) {
      lines.push(
        `  regions: ${comparison.regions
          .map(
            ({ bounds, pixelCount }) =>
              `x=${bounds.x} y=${bounds.y} width=${bounds.width} height=${bounds.height} pixels=${pixelCount}`
          )
          .join("; ")}`
      );
    }
    if (comparison.warnings !== undefined && comparison.warnings.length > 0) {
      lines.push(`  warnings: ${comparison.warnings.join(", ")}`);
    }
    const artifacts = formatArtifactPaths(comparison);
    if (artifacts !== undefined) {
      lines.push(artifacts);
    }
  }
  return lines;
};
