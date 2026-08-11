import { execFile, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseArgs, promisify } from "node:util";
import {
  createBrowserScreenshotSession,
  type BrowserScreenshotSession,
} from "@webstudio-is/vision/browser";
import {
  openScreenshotComparisonReport,
  writeScreenshotComparisonReport,
  type ScreenshotComparisonReport,
} from "@webstudio-is/vision/report";
import { compareVisualEntries } from "@webstudio-is/vision/comparison";
import {
  restoreScreenshotCache,
  writeScreenshotCache,
} from "@webstudio-is/vision/screenshot-cache";
import {
  defaultScreenshotDependencies,
  resolveScreenshotBrowser,
} from "webstudio/vision";
import {
  readStoryManifest,
  readStorySources,
  type VisualStoryEntry,
} from "./manifest";
import {
  captureStories,
  createCaptureSessionOptions,
  getInitialCaptureTarget,
} from "./capture";
import { classifyVisualTestRun } from "./shared";
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
const execFileAsync = promisify(execFile);
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

const getCommandOutput = async (command: string, commandArgs: string[]) => {
  const { stdout } = await execFileAsync(command, commandArgs, {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  return stdout.trim();
};

const getScreenshotRuntimeHash = async (browserPath: string) => {
  const runtimeHash = createHash("sha256");
  const runtimeFiles = (
    await readFile(
      new URL("./screenshot-runtime-files.txt", import.meta.url),
      "utf8"
    )
  )
    .split("\n")
    .filter((file) => file !== "");
  for (const file of runtimeFiles) {
    runtimeHash.update(await readFile(path.join(repositoryRoot, file)));
  }
  runtimeHash.update(await getCommandOutput(browserPath, ["--version"]));
  return runtimeHash.digest("hex").slice(0, 12);
};

const getScreenshotCacheDirectory = (revision: string, runtimeHash: string) =>
  path.join(screenshotCacheRoot, `${revision}-${runtimeHash}`);

type StoryCapture = Awaited<ReturnType<typeof captureStories>>;

const replaceStoryCaptures = ({
  ids,
  capture,
  replacement,
}: {
  ids: readonly string[];
  capture: StoryCapture;
  replacement: StoryCapture;
}) => {
  for (const id of ids) {
    capture.paths.delete(id);
    capture.errors.delete(id);
  }
  for (const [id, screenshotPath] of replacement.paths) {
    capture.paths.set(id, screenshotPath);
  }
  for (const [id, error] of replacement.errors) {
    capture.errors.set(id, error);
  }
};

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
}) => {
  return await compareVisualEntries({
    baselineEntries: Object.values(baselineEntries),
    currentEntries: Object.values(currentEntries),
    baselinePaths,
    currentPaths,
    baselineErrors,
    currentErrors,
    artifactDirectory: assetDirectory,
    pixelThreshold,
    maxMismatchPercentage,
    concurrency: Math.min(4, os.availableParallelism()),
  });
};

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
  let browserSession: BrowserScreenshotSession | undefined;
  let report: ScreenshotComparisonReport | undefined;

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
      directory: screenshotCacheDirectory,
      ids: Object.keys(filteredBaselineEntries),
      getOutputPath: (id) => path.join(assetDirectory, id, "baseline.png"),
    });
    if (cachedBaselinePaths !== undefined) {
      console.info(`Reusing baseline screenshots for ${baselineCommit}.`);
    } else {
      console.info(
        `Baseline screenshot cache is unavailable; rendering ${
          Object.keys(filteredBaselineEntries).length
        } baseline stories.`
      );
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

    const baselineEntriesToCapture = Object.values(filteredBaselineEntries);
    const currentEntriesToCapture = Object.values(filteredCurrentEntries);
    if (
      baselineEntriesToCapture.length === 0 &&
      currentEntriesToCapture.length === 0
    ) {
      throw new Error("No stories matched the visual comparison.");
    }
    const initialCapture = getInitialCaptureTarget({
      baselineEntries: baselineEntriesToCapture,
      currentEntries: currentEntriesToCapture,
      hasCachedBaseline: cachedBaselinePaths !== undefined,
    });
    if (initialCapture !== undefined) {
      const firstOutput = path.join(
        assetDirectory,
        initialCapture.entry.id,
        "browser-session.png"
      );
      await mkdir(path.dirname(firstOutput), { recursive: true });
      browserSession = await createBrowserScreenshotSession(
        createCaptureSessionOptions({
          browserPath: browser.path,
          entry: initialCapture.entry,
          output: firstOutput,
          port:
            initialCapture.target === "baseline" ? baselinePort : currentPort,
        })
      );
    }
    const baselineCapturePromise =
      cachedBaselinePaths === undefined
        ? captureStories({
            assetDirectory,
            browserPath: browser.path,
            concurrency: captureConcurrency,
            entries: baselineEntriesToCapture,
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
      entries: currentEntriesToCapture,
      port: currentPort,
      target: "current",
      session: browserSession,
    });
    const [baselineCapture, currentCapture] = await Promise.all([
      baselineCapturePromise,
      currentCapturePromise,
    ]);
    logPhase("Screenshots");
    let comparisons = await compareStories({
      baselineEntries: filteredBaselineEntries,
      currentEntries: filteredCurrentEntries,
      baselinePaths: baselineCapture.paths,
      currentPaths: currentCapture.paths,
      baselineErrors: baselineCapture.errors,
      currentErrors: currentCapture.errors,
    });
    logPhase("Image comparison");
    const changedIds = comparisons
      .filter(({ status }) => status === "changed")
      .map(({ id }) => id);
    if (changedIds.length > 0) {
      console.info(
        `Verifying ${changedIds.length} visual differences with serial captures.`
      );
      const changedBaselineEntries = changedIds.flatMap((id) => {
        const entry = filteredBaselineEntries[id];
        return entry === undefined ? [] : [entry];
      });
      const changedCurrentEntries = changedIds.flatMap((id) => {
        const entry = filteredCurrentEntries[id];
        return entry === undefined ? [] : [entry];
      });
      if (cachedBaselinePaths !== undefined) {
        await run({
          command: "pnpm",
          commandArgs: ["install", "--frozen-lockfile", "--ignore-scripts"],
          cwd: checkout,
        });
        servers.push(
          await startVisualStoryServer({
            root: checkout,
            port: baselinePort,
            outputDirectory: baselineBundleDirectory,
            storyFiles: changedBaselineEntries.map((entry) => entry.file),
          })
        );
      }
      const baselineVerification = await captureStories({
        assetDirectory,
        browserPath: browser.path,
        concurrency: 1,
        entries: changedBaselineEntries,
        port: baselinePort,
        target: "baseline",
        session: browserSession,
      });
      const currentVerification = await captureStories({
        assetDirectory,
        browserPath: browser.path,
        concurrency: 1,
        entries: changedCurrentEntries,
        port: currentPort,
        target: "current",
        session: browserSession,
      });
      replaceStoryCaptures({
        ids: changedIds,
        capture: baselineCapture,
        replacement: baselineVerification,
      });
      replaceStoryCaptures({
        ids: changedIds,
        capture: currentCapture,
        replacement: currentVerification,
      });
      comparisons = await compareStories({
        baselineEntries: filteredBaselineEntries,
        currentEntries: filteredCurrentEntries,
        baselinePaths: baselineCapture.paths,
        currentPaths: currentCapture.paths,
        baselineErrors: baselineCapture.errors,
        currentErrors: currentCapture.errors,
      });
      logPhase("Serial verification");
    }
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
    report = {
      baselineLabel: baselineCommit,
      currentLabel: currentCommit,
      durationMs: Date.now() - startedAt,
      comparisons,
      errors: [],
    };
  } catch (error) {
    const message =
      error instanceof Error ? (error.stack ?? error.message) : String(error);
    report = {
      baselineLabel: baseRef,
      currentLabel: "HEAD",
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
  await writeScreenshotComparisonReport({ report, reportDirectory });
  const result = classifyVisualTestRun({ report, approved });
  const changed = report.comparisons.filter(
    ({ status }) => status !== "unchanged"
  ).length;
  console.info(
    `${report.comparisons.length} stories compared in ${(
      report.durationMs / 1000
    ).toFixed(1)}s; ${changed} differences.`
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
    openScreenshotComparisonReport(path.join(reportDirectory, "index.html"));
  }
  process.exitCode = result === "passed" || result === "approved" ? 0 : 1;
};

await main();
