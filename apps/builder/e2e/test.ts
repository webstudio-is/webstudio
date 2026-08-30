import { parseBuilderUrl } from "@webstudio-is/protocol";
import {
  test as base,
  type Browser,
  type BrowserContextOptions,
} from "@playwright/test";
import env from "../app/env/env.server";

const builderPort = process.env.PORT ?? "3000";

export const builderUrl =
  process.env.E2E_BUILDER_URL ?? `https://127.0.0.1:${builderPort}`;

const builderUrlObject = new URL(builderUrl);

export const dashboardUrl = `${builderUrlObject.protocol}//wstd.dev:${builderUrlObject.port}`;

export const postgrestUrl = env.POSTGREST_URL;

export const browserContextOptions: BrowserContextOptions = {
  ignoreHTTPSErrors: true,
  permissions: ["clipboard-read", "clipboard-write"],
};

const isLoopbackHost = (hostname: string) =>
  hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";

export const getBrowserLaunchOptions = (url = builderUrl) => {
  const hostname = new URL(url).hostname;
  if (isLoopbackHost(hostname) === false) {
    return {};
  }
  return {
    args: [
      "--host-resolver-rules=MAP wstd.dev 127.0.0.1,MAP *.wstd.dev 127.0.0.1",
    ],
  };
};

export const test = base;

export const newBrowserContext = (browser: Browser) =>
  browser.newContext(browserContextOptions);

export const withBrowserContext = async <Result>(
  browser: Browser,
  run: (
    context: Awaited<ReturnType<typeof newBrowserContext>>
  ) => Promise<Result> | Result
) => {
  const context = await newBrowserContext(browser);
  try {
    return await run(context);
  } finally {
    await context.close();
  }
};

export const newIsolatedPage = async (browser: Browser) => {
  const context = await newBrowserContext(browser);
  return {
    page: await context.newPage(),
    close: () => context.close(),
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
