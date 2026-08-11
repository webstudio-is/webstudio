import { createHash } from "node:crypto";
import path from "node:path";
import { createScreenshotDiffPool } from "./diff-pool";
import { arePngFilesIdentical, diffPngFiles } from "./screenshot-diff";
import type { ScreenshotComparisonReportItem } from "./screenshot-report";

export type VisualEntry = {
  id: string;
};

export type VisualComparison<Entry extends VisualEntry = VisualEntry> = {
  id: string;
  status: "added" | "removed" | "comparable";
  baseline: Entry | undefined;
  current: Entry | undefined;
};

const indexVisualEntries = <Entry extends VisualEntry>(
  entries: readonly Entry[],
  label: "baseline" | "current"
) => {
  const indexed = new Map<string, Entry>();
  for (const entry of entries) {
    if (indexed.has(entry.id)) {
      throw new Error(
        `Duplicate ${label} visual entry id: ${JSON.stringify(entry.id)}`
      );
    }
    indexed.set(entry.id, entry);
  }
  return indexed;
};

export const getVisualComparisons = <Entry extends VisualEntry>({
  baselineEntries,
  currentEntries,
}: {
  baselineEntries: readonly Entry[];
  currentEntries: readonly Entry[];
}): VisualComparison<Entry>[] => {
  const baselineById = indexVisualEntries(baselineEntries, "baseline");
  const currentById = indexVisualEntries(currentEntries, "current");
  const ids = new Set([...baselineById.keys(), ...currentById.keys()]);

  return [...ids].sort().map((id) => {
    const baseline = baselineById.get(id);
    const current = currentById.get(id);
    if (baseline === undefined) {
      return { id, status: "added", baseline, current };
    }
    if (current === undefined) {
      return { id, status: "removed", baseline, current };
    }
    return { id, status: "comparable", baseline, current };
  });
};

export type VisualReportEntry = VisualEntry & {
  title: string;
  name: string;
};

export const compareVisualEntries = async <Entry extends VisualReportEntry>({
  baselineEntries,
  currentEntries,
  baselinePaths,
  currentPaths,
  baselineErrors,
  currentErrors,
  artifactDirectory,
  pixelThreshold,
  maxMismatchPercentage,
  concurrency,
  analyzeText = "when-different",
  writeArtifacts = "when-different",
}: {
  baselineEntries: readonly Entry[];
  currentEntries: readonly Entry[];
  baselinePaths: ReadonlyMap<string, string>;
  currentPaths: ReadonlyMap<string, string>;
  baselineErrors: ReadonlyMap<string, string>;
  currentErrors: ReadonlyMap<string, string>;
  artifactDirectory: string;
  pixelThreshold: number;
  maxMismatchPercentage: number;
  concurrency: number;
  analyzeText?: boolean | "when-different";
  writeArtifacts?: boolean | "when-different";
}): Promise<ScreenshotComparisonReportItem[]> => {
  const comparisons = getVisualComparisons({
    baselineEntries,
    currentEntries,
  });
  const identical = new Map(
    await Promise.all(
      comparisons.flatMap((comparison) => {
        if (
          comparison.status !== "comparable" ||
          baselineErrors.has(comparison.id) ||
          currentErrors.has(comparison.id)
        ) {
          return [];
        }
        const baselinePath = baselinePaths.get(comparison.id);
        const currentPath = currentPaths.get(comparison.id);
        if (baselinePath === undefined || currentPath === undefined) {
          return [];
        }
        return [
          arePngFilesIdentical(baselinePath, currentPath).then(
            (equal) => [comparison.id, equal] as const
          ),
        ];
      })
    )
  );
  const differentCount = [...identical.values()].filter(
    (equal) => equal === false
  ).length;
  const pool =
    differentCount > 1
      ? createScreenshotDiffPool(Math.min(concurrency, differentCount))
      : undefined;
  const runDiff =
    pool === undefined
      ? diffPngFiles
      : (options: Parameters<typeof diffPngFiles>[0]) => pool.run(options);
  try {
    return await Promise.all(
      comparisons.map(
        async (comparison): Promise<ScreenshotComparisonReportItem> => {
          const entry = comparison.current ?? comparison.baseline;
          if (entry === undefined) {
            throw new Error(`Visual comparison has no entry: ${comparison.id}`);
          }
          const baselinePath = baselinePaths.get(comparison.id);
          const currentPath = currentPaths.get(comparison.id);
          const captureErrors = [
            baselineErrors.get(comparison.id),
            currentErrors.get(comparison.id),
          ].filter((error): error is string => error !== undefined);
          if (captureErrors.length > 0) {
            return {
              ...entry,
              status: "error",
              baselinePath,
              currentPath,
              error: captureErrors.join("\n\n"),
            };
          }
          if (comparison.status === "added") {
            return { ...entry, status: "added", currentPath };
          }
          if (comparison.status === "removed") {
            return { ...entry, status: "removed", baselinePath };
          }
          if (baselinePath === undefined || currentPath === undefined) {
            throw new Error(`Screenshot is missing for ${comparison.id}`);
          }
          if (identical.get(comparison.id) === true) {
            return {
              ...entry,
              status: "unchanged",
              baselinePath,
              currentPath,
              differentPixels: 0,
              mismatchPercentage: 0,
              regions: [],
              textAnalysis: {
                status: "skipped",
                provider: "tesseract",
                changes: [],
              },
              warnings: [],
            };
          }
          const diff = await runDiff({
            baselinePath,
            currentPath,
            outputDir: path.join(
              artifactDirectory,
              createHash("sha256").update(comparison.id).digest("hex")
            ),
            threshold: pixelThreshold,
            analyzeText,
            writeArtifacts,
          });
          const changed =
            diff.dimensionMismatch !== undefined ||
            diff.mismatchPercentage > maxMismatchPercentage;
          return {
            ...entry,
            status: changed ? "changed" : "unchanged",
            baselinePath,
            currentPath,
            diffPath: diff.diffPath,
            contextDiffPath: diff.contextDiffPath,
            differentPixels: diff.differentPixels,
            mismatchPercentage: diff.mismatchPercentage,
            regions: diff.regions,
            textAnalysis: diff.textAnalysis,
            warnings: diff.warnings,
          };
        }
      )
    );
  } finally {
    await pool?.close();
  }
};
