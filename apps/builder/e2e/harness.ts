import { parseBuilderUrl } from "@webstudio-is/protocol";
import { basename } from "node:path";
import { AsyncLocalStorage } from "node:async_hooks";
import {
  chromium,
  type Browser,
  type BrowserContext,
  type BrowserContextOptions,
  type LaunchOptions,
} from "playwright";
import env from "../app/env/env.server";

const builderPort = process.env.PORT ?? "3000";

export const builderUrl =
  process.env.E2E_BUILDER_URL ?? `https://127.0.0.1:${builderPort}`;

const builderUrlObject = new URL(builderUrl);

export const dashboardUrl = `${builderUrlObject.protocol}//wstd.dev:${builderUrlObject.port}`;

export const postgrestUrl = env.POSTGREST_URL;

export type Test = {
  name: string;
  run: () => Promise<void>;
};

export type Suite = {
  name: string;
  fileName: string;
  filePath: string;
  beforeAll?: () => Promise<void>;
  beforeEach?: () => Promise<void>;
  afterAll?: () => Promise<void>;
  tests: Test[];
};

type TestApi = ((name: string, run: () => Promise<void>) => void) & {
  beforeAll: (run: () => Promise<void>) => void;
  beforeEach: (run: () => Promise<void>) => void;
  afterAll: (run: () => Promise<void>) => void;
};

const suites: Suite[] = [];
const suitesByFile = new Map<string, Suite>();

const formatSuiteName = (filePath: string) => {
  return basename(filePath, ".e2e.ts")
    .replace(/\.\[shard-\d+\]$/, "")
    .replaceAll("-", " ");
};

const getCallerFile = () => {
  const stack = new Error().stack ?? "";
  const callerLine = stack
    .split("\n")
    .find(
      (line) =>
        line.includes("/e2e/tests/") &&
        line.includes(".e2e.ts") &&
        line.includes("/harness.ts") === false
    );
  const filePath = callerLine?.match(/(\/[^():]+\.e2e\.ts)/)?.[1];
  if (filePath === undefined) {
    throw new Error("Expected e2e test to be registered from an .e2e.ts file");
  }
  return filePath;
};

const getFileSuite = () => {
  const filePath = getCallerFile();
  let suite = suitesByFile.get(filePath);
  if (suite !== undefined) {
    return suite;
  }

  suite = {
    name: formatSuiteName(filePath),
    fileName: basename(filePath),
    filePath,
    tests: [],
  };
  suitesByFile.set(filePath, suite);
  suites.push(suite);
  return suite;
};

export const test: TestApi = Object.assign(
  (name: string, run: () => Promise<void>) => {
    getFileSuite().tests.push({ name, run });
  },
  {
    beforeAll: (run: () => Promise<void>) => {
      getFileSuite().beforeAll = run;
    },
    beforeEach: (run: () => Promise<void>) => {
      getFileSuite().beforeEach = run;
    },
    afterAll: (run: () => Promise<void>) => {
      getFileSuite().afterAll = run;
    },
  }
);

export const getSuites = () => suites;

let browser: Browser | undefined;
let context: BrowserContext | undefined;

export type BrowserScope = {
  run: <Result>(task: () => Promise<Result>) => Promise<Result>;
  reset: () => Promise<void>;
  close: () => Promise<void>;
};

type BrowserScopeState = {
  scopeKey: object;
  context: BrowserContext;
  isolatedContexts: Set<BrowserContext>;
};

const browserScopeStorage = new AsyncLocalStorage<BrowserScopeState>();

export const getBrowserScopeKey = () => {
  const scopeKey = browserScopeStorage.getStore()?.scopeKey;
  if (scopeKey === undefined) {
    throw new Error("Expected an active browser scope");
  }
  return scopeKey;
};

const browserContextOptions: BrowserContextOptions = {
  ignoreHTTPSErrors: true,
  permissions: ["clipboard-read", "clipboard-write"],
};

const isLoopbackHost = (hostname: string) =>
  hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";

export const getBrowserLaunchOptions = (url = builderUrl): LaunchOptions => {
  const hostname = new URL(url).hostname;
  if (isLoopbackHost(hostname) === false) {
    return {};
  }
  return {
    // Builder tests use project subdomains such as p-project-id.wstd.dev.
    args: [
      "--host-resolver-rules=MAP wstd.dev 127.0.0.1,MAP *.wstd.dev 127.0.0.1",
    ],
  };
};

export const startBrowser = async () => {
  browser = await chromium.launch(getBrowserLaunchOptions());
  context = await browser.newContext(browserContextOptions);
};

export const stopBrowser = async () => {
  await context?.close();
  await browser?.close();
  context = undefined;
  browser = undefined;
};

export const createBrowserScopeForBrowser = async (
  browserInstance: Pick<Browser, "newContext">
): Promise<BrowserScope> => {
  const scopeKey = {};
  const createState = async (): Promise<BrowserScopeState> => {
    return {
      scopeKey,
      context: await browserInstance.newContext(browserContextOptions),
      isolatedContexts: new Set(),
    };
  };
  let state = await createState();
  const closeState = async (target: BrowserScopeState) => {
    await Promise.allSettled(
      [...target.isolatedContexts].map((isolatedContext) =>
        isolatedContext.close()
      )
    );
    target.isolatedContexts.clear();
    await target.context.close().catch(() => undefined);
  };
  return {
    run: async (task) => {
      const activeState = state;
      return await browserScopeStorage.run(activeState, task);
    },
    reset: async () => {
      const previousState = state;
      await closeState(previousState);
      state = await createState();
    },
    close: async () => await closeState(state),
  };
};

export const createBrowserScope = async (): Promise<BrowserScope> => {
  if (browser === undefined) {
    throw new Error("Browser is not initialized");
  }
  return await createBrowserScopeForBrowser(browser);
};

export const newPage = async () => {
  const activeContext = browserScopeStorage.getStore()?.context ?? context;
  if (activeContext === undefined) {
    throw new Error("Browser context is not initialized");
  }

  return await activeContext.newPage();
};

export const newIsolatedPage = async () => {
  if (browser === undefined) {
    throw new Error("Browser is not initialized");
  }

  const isolatedContext = await browser.newContext(browserContextOptions);
  const scope = browserScopeStorage.getStore();
  scope?.isolatedContexts.add(isolatedContext);

  return {
    page: await isolatedContext.newPage(),
    close: async () => {
      scope?.isolatedContexts.delete(isolatedContext);
      await isolatedContext.close();
    },
  };
};

export const getProjectBuilderUrl = ({
  projectId,
  authToken,
  mode,
  features,
}: {
  projectId: string;
  authToken?: string;
  mode?: "content" | "preview";
  features?: string[];
}) => {
  const url = new URL(dashboardUrl);
  url.hostname = `p-${projectId}.wstd.dev`;
  if (authToken !== undefined) {
    url.searchParams.set("authToken", authToken);
  }
  if (mode !== undefined) {
    url.searchParams.set("mode", mode);
  }
  if (features !== undefined && features.length > 0) {
    url.searchParams.set("features", features.join(","));
  }
  return url.href;
};

export const getProjectIdFromBuilderUrl = (url: string) => {
  return parseBuilderUrl(url).projectId;
};

export const assert = (
  condition: unknown,
  message: string
): asserts condition => {
  if (condition === false || condition === undefined || condition === null) {
    throw new Error(message);
  }
};
