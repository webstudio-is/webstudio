import { spawn, type ChildProcess } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import {
  dashboardUrl,
  getSuites,
  newPage,
  postgrestUrl,
  startBrowser,
  stopBrowser,
} from "./harness";
import { resetDatabase } from "./db";
import { logPerf, measure, printPerfSummary } from "./perf";
import "./tests/animation-runtime.[shard-1].e2e";
import "./tests/content-mode-editing.[shard-1].e2e";
import "./tests/content-mode-editing.[shard-2].e2e";
import "./tests/content-mode-editing.[shard-3].e2e";
import "./tests/data-variables-runtime.[shard-2].e2e";
import "./tests/pages-actions.[shard-1].e2e";
import "./tests/pages-actions.[shard-2].e2e";
import "./tests/pages-actions.[shard-3].e2e";
import "./tests/preview-links.[shard-1].e2e";
import "./tests/project-settings-runtime.[shard-2].e2e";
import "./tests/props-runtime.[shard-2].e2e";
import "./tests/share-link-permissions.[shard-1].e2e";
import "./tests/slot-keyboard.[shard-3].e2e";
import "./tests/style-panel-runtime.[shard-1].e2e";
import "./tests/style-panel-runtime.[shard-2].e2e";
import "./tests/style-panel-runtime.[shard-3].e2e";

const testTimeoutMs =
  Number.parseInt(process.env.E2E_TEST_TIMEOUT_MS ?? "", 10) || 120_000;
const testShard = process.env.E2E_TEST_SHARD?.trim();
const testFilters = [
  ...(process.env.E2E_TEST_FILTERS ?? "")
    .split("\n")
    .map((filter) => filter.trim())
    .filter(Boolean),
  ...(process.env.E2E_TEST_FILTER === undefined
    ? []
    : [process.env.E2E_TEST_FILTER]),
];

process.env.NODE_TLS_REJECT_UNAUTHORIZED ??= "0";

const waitForHttp = async (url: string, timeoutMs: number) => {
  const startedAt = Date.now();
  let lastError: unknown;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      await response.arrayBuffer();
      if (response.status < 500) {
        return;
      }
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }

  throw new Error(`Timed out waiting for ${url}: ${String(lastError)}`);
};

const waitForPostgrest = async () => {
  const url = new URL("/User?select=*", postgrestUrl);
  const startedAt = Date.now();
  let successfulResponses = 0;

  while (Date.now() - startedAt < 30_000) {
    try {
      const response = await fetch(url.href);
      await response.arrayBuffer();
      if (response.status < 500) {
        successfulResponses += 1;
        if (successfulResponses === 3) {
          return;
        }
      }
    } catch {
      successfulResponses = 0;
    }
    await delay(250);
  }

  throw new Error(`Timed out waiting for ${url.href}`);
};

const waitForBuilder = async (child: ChildProcess) => {
  await Promise.race([
    waitForHttp(dashboardUrl, 60_000),
    new Promise<never>((_, reject) => {
      child.once("exit", (code, signal) => {
        reject(
          new Error(
            `Builder server exited before becoming ready: code=${code}, signal=${signal}`
          )
        );
      });
    }),
  ]);
};

const warmLoginRoute = async () => {
  const page = await newPage();
  try {
    await page.goto(`${dashboardUrl}/login`);
    await page
      .getByRole("button", { name: "Login with Secret" })
      .waitFor({ state: "visible", timeout: 60_000 });
  } finally {
    await page.close();
  }
};

const withTimeout = async <Result>(
  name: string,
  timeoutMs: number,
  task: () => Promise<Result>
) => {
  let timeout: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      task(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          reject(new Error(`Timed out after ${timeoutMs}ms: ${name}`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
};

const pipeBuilderOutput = (child: ChildProcess) => {
  child.stdout?.on("data", (chunk) => {
    process.stdout.write(`[builder] ${chunk}`);
  });
  child.stderr?.on("data", (chunk) => {
    process.stderr.write(`[builder] ${chunk}`);
  });
};

const runSuiteTests = async ({
  suite,
  tests,
}: {
  suite: ReturnType<typeof getSuites>[number];
  tests: ReturnType<typeof getSuites>[number]["tests"];
}) => {
  try {
    for (const test of tests) {
      const startedAt = Date.now();
      await withTimeout(
        `${suite.name} › ${test.name}`,
        testTimeoutMs,
        async () => {
          await suite.beforeEach?.();
          await test.run();
        }
      );
      const duration = Date.now() - startedAt;
      console.info(`✓ ${suite.name} › ${test.name} (${duration}ms)`);
    }
  } finally {
    const afterAllStartedAt = Date.now();
    await withTimeout(`${suite.name} afterAll`, testTimeoutMs, async () => {
      await suite.afterAll?.();
    });
    logPerf(`${suite.name} afterAll`, afterAllStartedAt);
  }
};

const startBuiltBuilder = async () => {
  const child = spawn(
    "pnpm",
    ["exec", "tsx", "--conditions=webstudio", "./e2e/serve-built-remix.ts"],
    {
      cwd: new URL("..", import.meta.url),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  pipeBuilderOutput(child);
  return child;
};

const startBuilder = async (): Promise<ChildProcess | undefined> => {
  if (process.env.E2E_BUILDER_URL !== undefined) {
    return undefined;
  }

  const server = await startBuiltBuilder();
  try {
    await waitForBuilder(server);
  } catch (error) {
    await stopBuilder(server);
    throw error;
  }
  return server;
};

const stopBuilder = async (child: ChildProcess | undefined) => {
  if (child === undefined || child.killed) {
    return;
  }

  child.kill("SIGTERM");
  await Promise.race([
    new Promise<void>((resolve) => child.once("exit", () => resolve())),
    delay(5_000).then(() => {
      child.kill("SIGKILL");
    }),
  ]);
};

const getRunnableSuites = () => {
  const suites = getSuites()
    .filter((suite) => {
      if (testShard === undefined || testShard === "") {
        return true;
      }
      return suite.fileName.includes(`[${testShard}]`);
    })
    .map((suite) => ({
      suite,
      tests: suite.tests.filter((test) => {
        if (testFilters.length === 0) {
          return true;
        }
        const fullName = `${suite.name} › ${test.name}`;
        return testFilters.some(
          (filter) => test.name.includes(filter) || fullName.includes(filter)
        );
      }),
    }));

  const runnableSuites = suites.filter(({ tests }) => tests.length > 0);

  if (testShard !== undefined && testShard !== "" && suites.length === 0) {
    const availableFiles = getSuites().map((suite) => suite.fileName);
    throw new Error(
      [
        `E2E_TEST_SHARD did not match any test files: ${JSON.stringify(testShard)}`,
        "Available test files:",
        ...availableFiles.map((file) => `- ${file}`),
      ].join("\n")
    );
  }

  if (testFilters.length > 0 && runnableSuites.length === 0) {
    const availableTests = suites.flatMap(({ suite }) =>
      suite.tests.map((test) => `${suite.name} › ${test.name}`)
    );
    throw new Error(
      [
        `E2E_TEST_FILTERS did not match any tests: ${JSON.stringify(testFilters)}`,
        "Available tests:",
        ...availableTests.map((name) => `- ${name}`),
      ].join("\n")
    );
  }

  return runnableSuites;
};

const run = async () => {
  const totalStartedAt = Date.now();
  const bootStartedAt = Date.now();
  let builder: ChildProcess | undefined;

  try {
    const runnableSuites = getRunnableSuites();
    if (process.env.E2E_VALIDATE_TEST_FILTER_ONLY === "true") {
      return;
    }
    const postgrestReady = measure("wait for postgrest", async () => {
      await waitForPostgrest();
    });
    const builderReady = measure("start builder", startBuilder);
    const browserReady = measure("start browser", startBrowser);
    builder = await builderReady;
    await postgrestReady;
    await browserReady;
    await measure("warm login route", warmLoginRoute);
    logPerf("boot builder/browser", bootStartedAt);
    const testsStartedAt = Date.now();

    await measure("reset database", resetDatabase);

    for (const { suite } of runnableSuites) {
      const beforeAllStartedAt = Date.now();
      await withTimeout(`${suite.name} beforeAll`, testTimeoutMs, async () => {
        await suite.beforeAll?.();
      });
      logPerf(`${suite.name} beforeAll`, beforeAllStartedAt);
    }

    await Promise.all(
      runnableSuites.map(async ({ suite, tests }) => {
        const suiteStartedAt = Date.now();
        await runSuiteTests({ suite, tests });
        const suiteDuration = Date.now() - suiteStartedAt;
        console.info(`✓ ${suite.name} completed (${suiteDuration}ms)`);
      })
    );
    logPerf("tests", testsStartedAt);
  } finally {
    await stopBrowser();
    await stopBuilder(builder);
    logPerf("runner total", totalStartedAt);
    printPerfSummary();
  }
};

run().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
