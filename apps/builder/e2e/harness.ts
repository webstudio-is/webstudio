import { parseBuilderUrl } from "@webstudio-is/http-client";
import {
  chromium,
  type Browser,
  type BrowserContext,
  type BrowserContextOptions,
} from "playwright";

const builderPort =
  process.env.E2E_BUILDER_PORT ?? String(56_000 + (process.pid % 1_000));

export const builderUrl =
  process.env.E2E_BUILDER_URL ?? `https://127.0.0.1:${builderPort}`;

const builderUrlObject = new URL(builderUrl);

export const dashboardUrl = `${builderUrlObject.protocol}//wstd.dev:${builderUrlObject.port}`;

export const postgrestUrl =
  process.env.POSTGREST_URL ?? "http://127.0.0.1:55433";

export const serviceToken =
  process.env.TRPC_SERVER_API_TOKEN ?? "e2e-service-token";

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
