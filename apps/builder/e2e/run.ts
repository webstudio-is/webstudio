import { spawn, type ChildProcess } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import {
  builderUrl,
  getSuites,
  postgrestUrl,
  serviceToken,
  startBrowser,
  stopBrowser,
} from "./harness";
import { logPerf, measure } from "./perf";
import { e2ePlans } from "./plans";
import "./tests/content-mode-editing.e2e";
import "./tests/share-link-permissions.e2e";

const testTimeoutMs =
  Number.parseInt(process.env.E2E_TEST_TIMEOUT_MS ?? "", 10) || 60_000;
const testFilter = process.env.E2E_TEST_FILTER;

process.env.NODE_TLS_REJECT_UNAUTHORIZED ??= "0";

const waitForHttp = async (url: string, timeoutMs: number) => {
  const startedAt = Date.now();
  let lastError: unknown;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      await fetch(url);
      return;
    } catch (error) {
      lastError = error;
      await delay(250);
    }
  }

  throw new Error(`Timed out waiting for ${url}: ${String(lastError)}`);
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

const startBuilder = async () => {
  if (process.env.E2E_BUILDER_URL !== undefined) {
    return undefined;
  }

  const child = spawn(
    "./node_modules/.bin/remix",
    [
      "vite:dev",
      "--host",
      "127.0.0.1",
      "--port",
      new URL(builderUrl).port,
      "--strictPort",
    ],
    {
      cwd: new URL("..", import.meta.url),
      env: {
        ...process.env,
        AUTH_SECRET: process.env.AUTH_SECRET ?? "test",
        DATABASE_URL:
          process.env.DATABASE_URL ??
          "postgresql://user:pass@localhost:55432/webstudio",
        DEV_LOGIN: "true",
        GITHUB_SHA: process.env.GITHUB_SHA ?? "local",
        POSTGREST_API_KEY: process.env.POSTGREST_API_KEY ?? "",
        POSTGREST_URL: postgrestUrl,
        PORT: new URL(builderUrl).port,
        PLANS: process.env.PLANS ?? JSON.stringify(e2ePlans),
        TRPC_SERVER_API_TOKEN: serviceToken,
      },
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  child.stdout?.on("data", (chunk) => {
    process.stdout.write(`[builder] ${chunk}`);
  });
  child.stderr?.on("data", (chunk) => {
    process.stderr.write(`[builder] ${chunk}`);
  });

  await waitForBuilder(child);
  return child;
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

const run = async () => {
  const totalStartedAt = Date.now();
  const bootStartedAt = Date.now();
  let builder: ChildProcess | undefined;

  try {
    const postgrestReady = measure("wait for postgrest", async () => {
      await waitForHttp(postgrestUrl, 30_000);
    });
    const builderReady = measure("start builder", startBuilder);
    const browserReady = measure("start browser", startBrowser);
    builder = await builderReady;
    await postgrestReady;
    await browserReady;
    logPerf("boot builder/browser", bootStartedAt);
    const testsStartedAt = Date.now();
    for (const suite of getSuites()) {
      const tests = suite.tests.filter(
        (test) => testFilter === undefined || test.name.includes(testFilter)
      );
      if (tests.length === 0) {
        continue;
      }

      const suiteStartedAt = Date.now();
      const beforeAllStartedAt = Date.now();
      await withTimeout(`${suite.name} beforeAll`, testTimeoutMs, async () => {
        await suite.beforeAll?.();
      });
      logPerf(`${suite.name} beforeAll`, beforeAllStartedAt);
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
      const suiteDuration = Date.now() - suiteStartedAt;
      console.info(`✓ ${suite.name} completed (${suiteDuration}ms)`);
    }
    logPerf("tests", testsStartedAt);
  } finally {
    await stopBrowser();
    await stopBuilder(builder);
    logPerf("runner total", totalStartedAt);
  }
};

run().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
