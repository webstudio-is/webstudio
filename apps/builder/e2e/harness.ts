import { parseBuilderUrl } from "@webstudio-is/protocol";
import { basename } from "node:path";
import {
  chromium,
  type Browser,
  type BrowserContext,
  type BrowserContextOptions,
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
  return basename(filePath, ".e2e.ts").replaceAll("-", " ");
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

  suite = { name: formatSuiteName(filePath), tests: [] };
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

const browserContextOptions: BrowserContextOptions = {
  ignoreHTTPSErrors: true,
  permissions: ["clipboard-read", "clipboard-write"],
};

export const startBrowser = async () => {
  browser = await chromium.launch();
  context = await browser.newContext(browserContextOptions);
};

export const stopBrowser = async () => {
  await context?.close();
  await browser?.close();
  context = undefined;
  browser = undefined;
};

export const newPage = async () => {
  if (context === undefined) {
    throw new Error("Browser context is not initialized");
  }

  return await context.newPage();
};

export const newIsolatedPage = async () => {
  if (browser === undefined) {
    throw new Error("Browser is not initialized");
  }

  const isolatedContext = await browser.newContext(browserContextOptions);

  return {
    page: await isolatedContext.newPage(),
    close: async () => {
      await isolatedContext.close();
    },
  };
};

export const getProjectBuilderUrl = ({
  projectId,
  authToken,
  mode,
}: {
  projectId: string;
  authToken?: string;
  mode?: "content" | "preview";
}) => {
  const url = new URL(dashboardUrl);
  url.hostname = `p-${projectId}.wstd.dev`;
  if (authToken !== undefined) {
    url.searchParams.set("authToken", authToken);
  }
  if (mode !== undefined) {
    url.searchParams.set("mode", mode);
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
