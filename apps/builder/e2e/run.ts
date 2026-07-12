import { spawn, type ChildProcess } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  builderUrl,
  createBrowserScope,
  dashboardUrl,
  getSuites,
  newPage,
  postgrestUrl,
  startBrowser,
  stopBrowser,
  type BrowserScope,
} from "./harness";
import { resetDatabase } from "./db";
import { logPerf, measure, printPerfSummary } from "./perf";
import { getE2eTestModules } from "./test-modules";
import { stopChildProcess } from "./process";
import { runWithTimeout } from "./timeout";

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

// Shard ownership lives in filenames, so adding a test file requires no second
// registry update and focused shards avoid unrelated fixture setup.
const testModules = getE2eTestModules(
  await readdir(fileURLToPath(new URL("./tests", import.meta.url))),
  testShard
);

for (const module of testModules) {
  await import(module);
}

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
    waitForHttp(builderUrl, 60_000),
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
  browserScope,
  onTimeout,
}: {
  suite: ReturnType<typeof getSuites>[number];
  tests: ReturnType<typeof getSuites>[number]["tests"];
  browserScope: BrowserScope;
  onTimeout: () => Promise<void>;
}) => {
  try {
    for (const test of tests) {
      const startedAt = Date.now();
      await runWithTimeout({
        name: `${suite.name} › ${test.name}`,
        timeoutMs: testTimeoutMs,
        onTimeout,
        task: async () =>
          await browserScope.run(async () => {
            await suite.beforeEach?.();
            await test.run();
          }),
      });
      const duration = Date.now() - startedAt;
      console.info(`✓ ${suite.name} › ${test.name} (${duration}ms)`);
    }
  } finally {
    const afterAllStartedAt = Date.now();
    await runWithTimeout({
      name: `${suite.name} afterAll`,
      timeoutMs: testTimeoutMs,
      onTimeout,
      task: async () => {
        await browserScope.run(async () => await suite.afterAll?.());
      },
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
  if (child === undefined) {
    return;
  }
  await stopChildProcess(child);
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
  const browserScopes: BrowserScope[] = [];

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

    const scopedSuites = await Promise.all(
      runnableSuites.map(async (runnableSuite) => {
        const browserScope = await createBrowserScope();
        browserScopes.push(browserScope);
        return { ...runnableSuite, browserScope };
      })
    );
    let resetAllBrowserScopesPromise: Promise<void> | undefined;
    const resetAllBrowserScopes = () => {
      resetAllBrowserScopesPromise ??= Promise.allSettled(
        browserScopes.map((scope) => scope.reset())
      ).then(() => undefined);
      return resetAllBrowserScopesPromise;
    };

    for (const { suite, browserScope } of scopedSuites) {
      const beforeAllStartedAt = Date.now();
      await runWithTimeout({
        name: `${suite.name} beforeAll`,
        timeoutMs: testTimeoutMs,
        onTimeout: resetAllBrowserScopes,
        task: async () => {
          await browserScope.run(async () => await suite.beforeAll?.());
        },
      });
      logPerf(`${suite.name} beforeAll`, beforeAllStartedAt);
    }

    await Promise.all(
      scopedSuites.map(async ({ suite, tests, browserScope }) => {
        const suiteStartedAt = Date.now();
        await runSuiteTests({
          suite,
          tests,
          browserScope,
          onTimeout: resetAllBrowserScopes,
        });
        const suiteDuration = Date.now() - suiteStartedAt;
        console.info(`✓ ${suite.name} completed (${suiteDuration}ms)`);
      })
    );
    logPerf("tests", testsStartedAt);
  } finally {
    await Promise.allSettled(browserScopes.map((scope) => scope.close()));
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
