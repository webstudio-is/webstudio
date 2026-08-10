import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import {
  createBrowserScreenshotSession,
  diffPngFiles,
} from "@webstudio-is/project-build/vision";
import {
  defaultScreenshotDependencies,
  resolveScreenshotBrowser,
} from "webstudio/vision";
import {
  readStoryManifest,
  readStorySources,
  type VisualStoryEntry,
} from "./manifest";
import { captureStories, createCaptureSessionOptions } from "./capture";
import { mapWithConcurrency } from "./concurrency";
import { openVisualReport } from "./open-report";
import { writeVisualReport } from "./report";
import {
  restoreScreenshotCache,
  writeScreenshotCache,
} from "./screenshot-cache";
import {
  classifyVisualTestRun,
  getStoryComparisons,
  type VisualComparisonResult,
  type VisualTestReport,
} from "./shared";
import { startVisualStoryServer } from "./story-server";

const repositoryRoot = process.cwd();
const outputRoot = path.join(repositoryRoot, ".visual-regression");
const reportDirectory = path.join(outputRoot, "report");
const assetDirectory = path.join(reportDirectory, "assets");
const screenshotCacheRoot = path.join(
  repositoryRoot,
  ".visual-regression-cache"
);
const baselinePort = 6101;
const currentPort = 6102;
const pixelThreshold = 0.1;
const maxMismatchPercentage = 0.001;
const captureConcurrency = Number(process.env.VISUAL_CAPTURE_CONCURRENCY ?? 5);
if (Number.isInteger(captureConcurrency) === false || captureConcurrency < 1) {
  throw new Error("VISUAL_CAPTURE_CONCURRENCY must be a positive integer.");
}

const { values: arguments_ } = parseArgs({
  args: process.argv.slice(2).filter((argument) => argument !== "--"),
  options: {
    base: { type: "string", default: "origin/main" },
    grep: { type: "string" },
    "open-report": { type: "boolean", default: false },
    "approve-visual-changes": { type: "boolean", default: false },
  },
  strict: true,
});
const baseRef = arguments_.base;
const grep = arguments_.grep;
const openReport = arguments_["open-report"];
const approved = arguments_["approve-visual-changes"];

const run = async ({
  command,
  commandArgs,
  cwd = repositoryRoot,
}: {
  command: string;
  commandArgs: string[];
  cwd?: string;
}) => {
  const child = spawn(command, commandArgs, {
    cwd,
    stdio: ["ignore", "inherit", "inherit"],
  });
  const exitCode = await new Promise<number>((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal !== null) {
        reject(new Error(`${command} exited with signal ${signal}`));
        return;
      }
      resolve(code ?? 1);
    });
  });
  if (exitCode !== 0) {
    throw new Error(`${command} exited with code ${exitCode}`);
  }
  return exitCode;
};

const getCommandBuffer = async (command: string, commandArgs: string[]) => {
  const chunks: Buffer[] = [];
  const child = spawn(command, commandArgs, {
    cwd: repositoryRoot,
    stdio: ["ignore", "pipe", "inherit"],
  });
  child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
  const exitCode = await new Promise<number>((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
  if (exitCode !== 0) {
    throw new Error(`${command} exited with code ${exitCode}`);
  }
  return Buffer.concat(chunks);
};

const getCommandOutput = async (command: string, commandArgs: string[]) =>
  (await getCommandBuffer(command, commandArgs)).toString("utf8").trim();

const getScreenshotRuntimeHash = async (browserPath: string) => {
  const runtimeHash = createHash("sha256");
  for (const file of [
    ".storybook/preview.tsx",
    ".storybook/story-sources.json",
    "scripts/visual-regression/capture.ts",
    "scripts/visual-regression/harness.tsx",
    "scripts/visual-regression/story-server.ts",
    "pnpm-lock.yaml",
  ]) {
    runtimeHash.update(await readFile(path.join(repositoryRoot, file)));
  }
  runtimeHash.update(await getCommandOutput(browserPath, ["--version"]));
  return runtimeHash.digest("hex").slice(0, 12);
};

const getScreenshotCacheDirectory = (revision: string, runtimeHash: string) =>
  path.join(screenshotCacheRoot, `${revision}-${runtimeHash}`);

const compareStories = async ({
  baselineEntries,
  currentEntries,
  baselinePaths,
  currentPaths,
  baselineErrors,
  currentErrors,
}: {
  baselineEntries: Record<string, VisualStoryEntry>;
  currentEntries: Record<string, VisualStoryEntry>;
  baselinePaths: Map<string, string>;
  currentPaths: Map<string, string>;
  baselineErrors: Map<string, string>;
  currentErrors: Map<string, string>;
}) =>
  await mapWithConcurrency({
    values: getStoryComparisons({ baselineEntries, currentEntries }),
    concurrency: 8,
    map: async (comparison): Promise<VisualComparisonResult> => {
      const entry = comparison.current ?? comparison.baseline;
      if (entry === undefined) {
        throw new Error(`Story comparison has no entry: ${comparison.id}`);
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
        return {
          ...entry,
          status: "added",
          currentPath,
        };
      }
      if (comparison.status === "removed") {
        return {
          ...entry,
          status: "removed",
          baselinePath,
        };
      }
      if (baselinePath === undefined || currentPath === undefined) {
        throw new Error(`Screenshot is missing for ${comparison.id}`);
      }
      const outputDir = path.join(assetDirectory, comparison.id);
      const diff = await diffPngFiles({
        baselinePath,
        currentPath,
        outputDir,
        threshold: pixelThreshold,
        analyzeText: "when-different",
        writeArtifacts: "when-different",
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
    },
  });

const main = async () => {
  const startedAt = Date.now();
  let phaseStartedAt = startedAt;
  const logPhase = (name: string) => {
    const now = Date.now();
    console.info(`${name}: ${((now - phaseStartedAt) / 1000).toFixed(1)}s`);
    phaseStartedAt = now;
  };
  const cacheKey = createHash("sha256")
    .update(repositoryRoot)
    .digest("hex")
    .slice(0, 12);
  const temporaryRoot = path.join(
    os.tmpdir(),
    `webstudio-visual-regression-${cacheKey}`
  );
  const checkout = path.join(temporaryRoot, "checkout");
  const baselineBundleDirectory = path.join(temporaryRoot, "baseline-bundle");
  const currentBundleDirectory = path.join(temporaryRoot, "current-bundle");
  const servers: Array<Awaited<ReturnType<typeof startVisualStoryServer>>> = [];
  let browserSession:
    | Awaited<ReturnType<typeof createBrowserScreenshotSession>>
    | undefined;
  let report: VisualTestReport | undefined;

  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(assetDirectory, { recursive: true });
  await mkdir(temporaryRoot, { recursive: true });

  try {
    const [baselineCommit, currentCommit] = await Promise.all([
      getCommandOutput("git", ["merge-base", "HEAD", baseRef]),
      getCommandOutput("git", ["rev-parse", "HEAD"]),
    ]);
    const currentRevisionIsClean =
      (await getCommandOutput("git", ["status", "--porcelain"])) === "";
    console.info(`Comparing ${baselineCommit} with ${currentCommit}`);
    const checkoutExists = await access(path.join(checkout, ".git"))
      .then(() => true)
      .catch(() => false);
    if (checkoutExists) {
      await run({
        command: "git",
        commandArgs: ["switch", "--detach", baselineCommit],
        cwd: checkout,
      });
    } else {
      await run({
        command: "git",
        commandArgs: ["worktree", "add", "--detach", checkout, baselineCommit],
      });
    }
    const currentSubmodules = await getCommandOutput("git", [
      "submodule",
      "status",
      "--recursive",
    ]);
    if (
      currentSubmodules
        .split("\n")
        .some((status) => status !== "" && status.startsWith("-") === false)
    ) {
      await run({
        command: "git",
        commandArgs: ["submodule", "update", "--init", "--recursive"],
        cwd: checkout,
      });
    }
    const browser = await resolveScreenshotBrowser(
      { browser: "auto" },
      defaultScreenshotDependencies
    );
    const currentStorySources = await readStorySources(repositoryRoot);
    if (currentStorySources === undefined) {
      throw new Error("Current story source configuration is missing.");
    }
    const baselineStorySources =
      (await readStorySources(checkout)) ?? currentStorySources;
    const [baselineEntries, currentEntries] = await Promise.all([
      readStoryManifest({ root: checkout, storySources: baselineStorySources }),
      readStoryManifest({
        root: repositoryRoot,
        storySources: currentStorySources,
      }),
    ]);
    const matches = grep === undefined ? undefined : new RegExp(grep, "i");
    const filterEntries = (entries: Record<string, VisualStoryEntry>) =>
      Object.fromEntries(
        Object.entries(entries).filter(
          ([id, entry]) =>
            matches === undefined ||
            matches.test(`${id} ${entry.title} ${entry.name}`)
        )
      );
    const filteredBaselineEntries = filterEntries(baselineEntries);
    const filteredCurrentEntries = filterEntries(currentEntries);
    const filteredIds = new Set([
      ...Object.keys(filteredBaselineEntries),
      ...Object.keys(filteredCurrentEntries),
    ]);
    console.info(`Running ${filteredIds.size} visual story ids.`);
    const screenshotRuntimeHash = await getScreenshotRuntimeHash(browser.path);
    const screenshotCacheDirectory = getScreenshotCacheDirectory(
      baselineCommit,
      screenshotRuntimeHash
    );
    const cachedBaselinePaths = await restoreScreenshotCache({
      assetDirectory,
      directory: screenshotCacheDirectory,
      storyIds: Object.keys(filteredBaselineEntries),
    });
    if (cachedBaselinePaths !== undefined) {
      console.info(`Reusing baseline screenshots for ${baselineCommit}.`);
    } else {
      await run({
        command: "pnpm",
        commandArgs: ["install", "--frozen-lockfile", "--ignore-scripts"],
        cwd: checkout,
      });
    }
    servers.push(
      ...(await Promise.all([
        ...(cachedBaselinePaths === undefined
          ? [
              startVisualStoryServer({
                root: checkout,
                port: baselinePort,
                outputDirectory: baselineBundleDirectory,
                storyFiles: Object.values(filteredBaselineEntries).map(
                  (entry) => entry.file
                ),
              }),
            ]
          : []),
        startVisualStoryServer({
          root: repositoryRoot,
          port: currentPort,
          outputDirectory: currentBundleDirectory,
          storyFiles: Object.values(filteredCurrentEntries).map(
            (entry) => entry.file
          ),
        }),
      ]))
    );
    logPhase("Setup and bundles");

    const firstEntry =
      Object.values(filteredBaselineEntries)[0] ??
      Object.values(filteredCurrentEntries)[0];
    if (firstEntry === undefined) {
      throw new Error("No stories matched the visual comparison.");
    }
    const firstOutput = path.join(
      assetDirectory,
      firstEntry.id,
      "browser-session.png"
    );
    await mkdir(path.dirname(firstOutput), { recursive: true });
    const firstPort =
      cachedBaselinePaths !== undefined ||
      Object.values(filteredBaselineEntries)[0] === undefined
        ? currentPort
        : baselinePort;
    browserSession = await createBrowserScreenshotSession(
      createCaptureSessionOptions({
        browserPath: browser.path,
        entry: firstEntry,
        output: firstOutput,
        port: firstPort,
      })
    );
    const baselineCapturePromise =
      cachedBaselinePaths === undefined
        ? captureStories({
            assetDirectory,
            browserPath: browser.path,
            concurrency: captureConcurrency,
            entries: Object.values(filteredBaselineEntries),
            port: baselinePort,
            target: "baseline",
            session: browserSession,
          })
        : Promise.resolve({
            paths: cachedBaselinePaths,
            errors: new Map<string, string>(),
          });
    const currentCapturePromise = captureStories({
      assetDirectory,
      browserPath: browser.path,
      concurrency: captureConcurrency,
      entries: Object.values(filteredCurrentEntries),
      port: currentPort,
      target: "current",
      session: browserSession,
    });
    const [baselineCapture, currentCapture] = await Promise.all([
      baselineCapturePromise,
      currentCapturePromise,
    ]);
    if (
      cachedBaselinePaths === undefined &&
      baselineCapture.errors.size === 0
    ) {
      await writeScreenshotCache({
        directory: screenshotCacheDirectory,
        paths: baselineCapture.paths,
      });
    }
    if (currentRevisionIsClean && currentCapture.errors.size === 0) {
      await writeScreenshotCache({
        directory: getScreenshotCacheDirectory(
          currentCommit,
          screenshotRuntimeHash
        ),
        paths: currentCapture.paths,
      });
    }
    logPhase("Screenshots");
    const comparisons = await compareStories({
      baselineEntries: filteredBaselineEntries,
      currentEntries: filteredCurrentEntries,
      baselinePaths: baselineCapture.paths,
      currentPaths: currentCapture.paths,
      baselineErrors: baselineCapture.errors,
      currentErrors: currentCapture.errors,
    });
    logPhase("Image comparison");
    report = {
      baselineCommit,
      currentCommit,
      durationMs: Date.now() - startedAt,
      comparisons,
      errors: [],
    };
  } catch (error) {
    const message =
      error instanceof Error ? (error.stack ?? error.message) : String(error);
    report = {
      baselineCommit: baseRef,
      currentCommit: "HEAD",
      durationMs: Date.now() - startedAt,
      comparisons: [],
      errors: [message],
    };
  } finally {
    await browserSession?.close().catch(() => undefined);
    await Promise.all(
      servers.map((server) => server.close().catch(() => undefined))
    );
    await Promise.all([
      rm(baselineBundleDirectory, { recursive: true, force: true }),
      rm(currentBundleDirectory, { recursive: true, force: true }),
    ]);
  }

  if (report === undefined) {
    throw new Error("Visual comparison did not produce a report.");
  }
  await writeVisualReport({ report, reportDirectory });
  const result = classifyVisualTestRun({ report, approved });
  const changed = report.comparisons.filter(
    ({ status }) => status !== "unchanged"
  ).length;
  console.info(
    `${report.comparisons.length} stories compared in ${(report.durationMs / 1000).toFixed(1)}s; ${changed} differences.`
  );
  if (result === "approved") {
    console.info(
      "Visual differences were explicitly approved for this revision."
    );
  } else if (result === "visual-differences") {
    console.error(
      "Visual differences detected. Open .visual-regression/report/index.html."
    );
  } else if (result === "test-failure") {
    console.error(
      "Visual regression infrastructure or story rendering failed."
    );
  }
  if (openReport) {
    openVisualReport(path.join(reportDirectory, "index.html"));
  }
  process.exitCode = result === "passed" || result === "approved" ? 0 : 1;
};

await main();
