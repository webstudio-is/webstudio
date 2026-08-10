import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  createBrowserScreenshotSession,
  diffPngFiles,
  type BrowserScreenshotOptions,
} from "@webstudio-is/project-build/vision";
import {
  defaultScreenshotDependencies,
  resolveScreenshotBrowser,
} from "../../packages/cli/src/screenshot";
import { readStoryManifest, type VisualStoryEntry } from "./manifest";
import { writeVisualReport } from "./report";
import {
  classifyVisualTestRun,
  getVisualShardIds,
  getStoryComparisons,
  parseVisualShard,
  type VisualComparisonResult,
  type VisualTestReport,
} from "./shared";
import { defaultStoryDelay, storyOptions } from "./story-options";
import { startVisualStoryServer } from "./story-server";

const repositoryRoot = process.cwd();
const outputRoot = path.join(repositoryRoot, ".visual-regression");
const reportDirectory = path.join(outputRoot, "report");
const assetDirectory = path.join(reportDirectory, "assets");
const baselinePort = 6101;
const currentPort = 6102;
const viewport = { width: 1280, height: 800 };
const pixelThreshold = 0.1;
const maxMismatchPercentage = 0;
const captureConcurrency = Number(process.env.VISUAL_CAPTURE_CONCURRENCY ?? 4);
const captureStaggerMs = Number(process.env.VISUAL_CAPTURE_STAGGER_MS ?? 500);

const args = process.argv.slice(2);
const getArgument = (name: string) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};

const baseRef = getArgument("--base") ?? "origin/main";
const grep = getArgument("--grep");
const shardArgument = getArgument("--shard");
const openReport = args.includes("--open-report");
const approved = args.includes("--approve-visual-changes");

const shard = parseVisualShard(shardArgument);

const run = async ({
  command,
  commandArgs,
  cwd = repositoryRoot,
  input,
  allowFailure = false,
}: {
  command: string;
  commandArgs: string[];
  cwd?: string;
  input?: Uint8Array;
  allowFailure?: boolean;
}) => {
  const child = spawn(command, commandArgs, {
    cwd,
    stdio: [input === undefined ? "ignore" : "pipe", "inherit", "inherit"],
  });
  if (input !== undefined) {
    child.stdin?.end(input);
  }
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
  if (exitCode !== 0 && allowFailure === false) {
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

const getStoryUrl = (port: number) => {
  const url = new URL("/__visual/", `http://127.0.0.1:${port}`);
  return url.href;
};

const getCaptureOptions = ({
  browserPath,
  entry,
  output,
  port,
  revision,
}: {
  browserPath: string;
  entry: VisualStoryEntry;
  output: string;
  port: number;
  revision: string;
}): BrowserScreenshotOptions => ({
  browserPath,
  output,
  ...viewport,
  fullPage: true,
  includeElementGeometry: false,
  url: getStoryUrl(port),
  uid: process.getuid?.(),
  disableSandbox: process.env.GITHUB_ACTIONS === "true",
  waitUntil: "load",
  prepareExpression: `window.renderVisualStory(${JSON.stringify({
    file: entry.file,
    exportName: entry.exportName,
    title: entry.title,
    disableIntervals: storyOptions[entry.id]?.disableIntervals === true,
    hideSelectors: storyOptions[entry.id]?.hideSelectors ?? [],
    revision,
  })}).catch(window.showVisualError)`,
  waitForSelector: "#visual-ready, #visual-error",
  failForSelector: "#visual-error",
  waitForTimeout: storyOptions[entry.id]?.delay ?? defaultStoryDelay,
  timeout: 30_000,
  format: "png",
  scale: 1,
});

const captureStories = async ({
  browserPath,
  entries,
  port,
  revision,
  target,
  session,
}: {
  browserPath: string;
  entries: readonly VisualStoryEntry[];
  port: number;
  revision: string;
  target: "baseline" | "current";
  session: Awaited<ReturnType<typeof createBrowserScreenshotSession>>;
}) => {
  const paths = new Map<string, string>();
  const options = await Promise.all(
    entries.map(async (entry) => {
      const output = path.join(assetDirectory, entry.id, `${target}.png`);
      await mkdir(path.dirname(output), { recursive: true });
      paths.set(entry.id, output);
      return getCaptureOptions({ browserPath, entry, output, port, revision });
    })
  );
  if (options.length > 0) {
    await session.capturePage(options, {
      concurrency: captureConcurrency,
      staggerMs: captureStaggerMs,
    });
  }
  return paths;
};

const mapWithConcurrency = async <Input, Output>({
  values,
  concurrency,
  map,
}: {
  values: readonly Input[];
  concurrency: number;
  map: (value: Input) => Promise<Output>;
}) => {
  const results = new Array<Output>(values.length);
  let nextIndex = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, async () => {
      while (nextIndex < values.length) {
        const index = nextIndex;
        nextIndex += 1;
        results[index] = await map(values[index]);
      }
    })
  );
  return results;
};

const compareStories = async ({
  baselineEntries,
  currentEntries,
  baselinePaths,
  currentPaths,
}: {
  baselineEntries: Record<string, VisualStoryEntry>;
  currentEntries: Record<string, VisualStoryEntry>;
  baselinePaths: Map<string, string>;
  currentPaths: Map<string, string>;
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
      let diff = await diffPngFiles({
        baselinePath,
        currentPath,
        outputDir,
        threshold: pixelThreshold,
        analyzeText: false,
        writeArtifacts: false,
      });
      const changed =
        diff.dimensionMismatch !== undefined ||
        diff.mismatchPercentage > maxMismatchPercentage;
      if (changed) {
        diff = await diffPngFiles({
          baselinePath,
          currentPath,
          outputDir,
          threshold: pixelThreshold,
          analyzeText: true,
        });
      }
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

const openVisualReport = async () => {
  const reportPath = path.join(reportDirectory, "index.html");
  if (process.platform === "darwin") {
    await run({
      command: "open",
      commandArgs: [reportPath],
      allowFailure: true,
    });
    return;
  }
  if (process.platform === "win32") {
    await run({
      command: "cmd",
      commandArgs: ["/c", "start", "", reportPath],
      allowFailure: true,
    });
    return;
  }
  await run({
    command: "xdg-open",
    commandArgs: [reportPath],
    allowFailure: true,
  });
};

const main = async () => {
  const startedAt = Date.now();
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
    await run({
      command: "pnpm",
      commandArgs: ["install", "--frozen-lockfile", "--ignore-scripts"],
      cwd: checkout,
    });

    const browser = await resolveScreenshotBrowser(
      { browser: "auto" },
      defaultScreenshotDependencies
    );
    const [baselineEntries, currentEntries] = await Promise.all([
      readStoryManifest(checkout),
      readStoryManifest(repositoryRoot),
    ]);
    const matches = grep === undefined ? undefined : new RegExp(grep, "i");
    const selectedIds = new Set(
      getVisualShardIds({
        baselineIds: Object.keys(baselineEntries),
        currentIds: Object.keys(currentEntries),
        shard,
      })
    );
    const filterEntries = (entries: Record<string, VisualStoryEntry>) =>
      Object.fromEntries(
        Object.entries(entries).filter(
          ([id, entry]) =>
            selectedIds.has(id) &&
            (matches === undefined ||
              matches.test(`${id} ${entry.title} ${entry.name}`))
        )
      );
    const filteredBaselineEntries = filterEntries(baselineEntries);
    const filteredCurrentEntries = filterEntries(currentEntries);
    const filteredIds = new Set([
      ...Object.keys(filteredBaselineEntries),
      ...Object.keys(filteredCurrentEntries),
    ]);
    console.info(
      `Running visual shard ${shard.index}/${shard.total} with ${filteredIds.size} story ids.`
    );
    servers.push(
      ...(await Promise.all([
        startVisualStoryServer({
          root: checkout,
          port: baselinePort,
          outputDirectory: baselineBundleDirectory,
        }),
        startVisualStoryServer({
          root: repositoryRoot,
          port: currentPort,
          outputDirectory: currentBundleDirectory,
        }),
      ]))
    );

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
    browserSession = await createBrowserScreenshotSession(
      getCaptureOptions({
        browserPath: browser.path,
        entry: firstEntry,
        output: firstOutput,
        port: baselinePort,
        revision: baselineCommit,
      })
    );
    const baselinePaths = await captureStories({
      browserPath: browser.path,
      entries: Object.values(filteredBaselineEntries),
      port: baselinePort,
      revision: baselineCommit,
      target: "baseline",
      session: browserSession,
    });

    const currentPaths = await captureStories({
      browserPath: browser.path,
      entries: Object.values(filteredCurrentEntries),
      port: currentPort,
      revision: currentCommit,
      target: "current",
      session: browserSession,
    });
    const comparisons = await compareStories({
      baselineEntries: filteredBaselineEntries,
      currentEntries: filteredCurrentEntries,
      baselinePaths,
      currentPaths,
    });
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
    await openVisualReport();
  }
  process.exitCode = result === "passed" || result === "approved" ? 0 : 1;
};

await main();
