import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { classifyVisualTestRun } from "./shared";

const repositoryRoot = process.cwd();
const outputRoot = path.join(repositoryRoot, ".visual-regression");
const reportDirectory = path.join(outputRoot, "report");
const resultPath = path.join(outputRoot, "results.json");

const args = process.argv.slice(2);
const getArgument = (name: string) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};

const baseRef = getArgument("--base") ?? "origin/main";
const grep = getArgument("--grep");
const openReport = args.includes("--open-report");
const approved = args.includes("--approve-visual-changes");

const run = async ({
  command,
  commandArgs,
  cwd = repositoryRoot,
  env,
  allowFailure = false,
}: {
  command: string;
  commandArgs: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  allowFailure?: boolean;
}) => {
  const child = spawn(command, commandArgs, {
    cwd,
    env: { ...process.env, ...env },
    stdio: "inherit",
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

  if (exitCode !== 0 && allowFailure === false) {
    throw new Error(`${command} exited with code ${exitCode}`);
  }
  return exitCode;
};

const getCommandOutput = async (command: string, commandArgs: string[]) => {
  let stdout = "";
  const child = spawn(command, commandArgs, {
    cwd: repositoryRoot,
    stdio: ["ignore", "pipe", "inherit"],
  });
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });
  const exitCode = await new Promise<number>((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
  if (exitCode !== 0) {
    throw new Error(`${command} exited with code ${exitCode}`);
  }
  return stdout.trim();
};

const main = async () => {
  const temporaryRoot = await mkdtemp(
    path.join(os.tmpdir(), "webstudio-visual-regression-")
  );
  const baselineCheckout = path.join(temporaryRoot, "baseline");
  const baselineStorybook = path.join(temporaryRoot, "baseline-storybook");
  const currentStorybook = path.join(temporaryRoot, "current-storybook");
  let worktreeCreated = false;
  let result = "test-failure" as ReturnType<typeof classifyVisualTestRun>;

  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true });

  try {
    const baselineCommit = await getCommandOutput("git", [
      "merge-base",
      "HEAD",
      baseRef,
    ]);
    console.info(`Comparing ${baselineCommit} with the current working tree`);

    await run({
      command: "git",
      commandArgs: [
        "worktree",
        "add",
        "--detach",
        baselineCheckout,
        baselineCommit,
      ],
    });
    worktreeCreated = true;

    await run({
      command: "pnpm",
      commandArgs: ["install", "--frozen-lockfile", "--ignore-scripts"],
      cwd: baselineCheckout,
    });

    await Promise.all([
      run({
        command: "pnpm",
        commandArgs: ["storybook:build", "--output-dir", baselineStorybook],
        cwd: baselineCheckout,
        env: { VISUAL_TESTING: "true" },
      }),
      run({
        command: "pnpm",
        commandArgs: ["storybook:build", "--output-dir", currentStorybook],
        env: { VISUAL_TESTING: "true" },
      }),
    ]);

    await run({
      command: "pnpm",
      commandArgs: ["exec", "playwright", "install", "chromium"],
    });

    const playwrightArgs = [
      "exec",
      "playwright",
      "test",
      "--config",
      "scripts/visual-regression/playwright.config.ts",
    ];
    if (grep !== undefined) {
      playwrightArgs.push("--grep", grep);
    }

    await run({
      command: "pnpm",
      commandArgs: playwrightArgs,
      env: {
        VISUAL_BASELINE_STORYBOOK_DIRECTORY: baselineStorybook,
        VISUAL_CURRENT_STORYBOOK_DIRECTORY: currentStorybook,
      },
      allowFailure: true,
    });

    const report = JSON.parse(await readFile(resultPath, "utf8"));
    result = classifyVisualTestRun({ report, approved });
  } finally {
    if (worktreeCreated) {
      await run({
        command: "git",
        commandArgs: ["worktree", "remove", "--force", baselineCheckout],
        allowFailure: true,
      });
    }
    await rm(temporaryRoot, { recursive: true, force: true });
  }

  if (result === "approved") {
    console.info(
      "Visual differences were explicitly approved for this revision."
    );
  } else if (result === "visual-differences") {
    console.error(
      "Visual differences detected. Open the report with pnpm visual-regression:report."
    );
  } else if (result === "test-failure") {
    console.error(
      "Visual regression infrastructure or story rendering failed."
    );
  }

  if (openReport) {
    await run({
      command: "pnpm",
      commandArgs: ["exec", "playwright", "show-report", reportDirectory],
      allowFailure: true,
    });
  }

  process.exitCode = result === "passed" || result === "approved" ? 0 : 1;
};

await main();
