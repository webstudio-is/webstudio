import { execFile, spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import type { Page as PlaywrightPage } from "playwright";
import { bundleVersion } from "@webstudio-is/protocol";
import { getStyleDeclKey, type Page } from "@webstudio-is/sdk";
import { loadDevBuild } from "../db";
import { stopChildProcess } from "../process";

const execFileAsync = promisify(execFile);
const cliLocalPath = fileURLToPath(
  new URL("../../../../packages/cli/local.js", import.meta.url)
);

type BuildRow = Awaited<ReturnType<typeof loadDevBuild>>;

const getAvailablePort = async () => {
  const server = createServer();
  server.unref();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    throw new Error("Expected a numeric port for generated-app preview.");
  }
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return address.port;
};

const waitForGeneratedPreview = async ({
  process,
  url,
  output,
}: {
  process: ChildProcess;
  url: string;
  output: () => string;
}) => {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (process.exitCode !== null || process.signalCode !== null) {
      throw new Error(
        `Generated preview exited before it became ready at ${url}. Output:\n${output()}`
      );
    }
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(2_000),
      });
      if (response.ok) {
        return await response.text();
      }
    } catch {
      // The generated production server is still starting.
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(
    `Generated preview did not become ready at ${url}. Output:\n${output()}`
  );
};

const parseBuildField = <Value>(build: BuildRow, field: keyof BuildRow) =>
  JSON.parse(String(build[field])) as Value;

const parseBuildEntriesById = <Value extends { id: string }>(
  build: BuildRow,
  field: keyof BuildRow
) => {
  return parseBuildField<Value[]>(build, field).map((value) => [
    value.id,
    value,
  ]);
};

const parseBuildStyleEntries = (build: BuildRow) => {
  return parseBuildField<Parameters<typeof getStyleDeclKey>[0][]>(
    build,
    "styles"
  ).map((style) => [getStyleDeclKey(style), style]);
};

const parseBuildStyleSourceSelectionEntries = (build: BuildRow) => {
  return parseBuildField<Array<{ instanceId: string }>>(
    build,
    "styleSourceSelections"
  ).map((selection) => [selection.instanceId, selection]);
};

const createLocalBundleFromDevBuild = (build: BuildRow) => {
  const pages = parseBuildField<{
    homePageId: string;
    pages: Page[];
  }>(build, "pages");
  const homePage = pages.pages.find((page) => page.id === pages.homePageId);
  if (homePage === undefined) {
    throw new Error("Expected dev build to have a home page");
  }

  return {
    bundleVersion,
    origin: "https://assets.example",
    projectDomain: "generated-e2e.example",
    projectTitle: pages.pages[0]?.name ?? "Generated E2E",
    page: homePage,
    pages: pages.pages,
    assets: [],
    build: {
      id: build.id,
      projectId: build.projectId,
      version: build.version,
      createdAt: build.createdAt,
      updatedAt: build.updatedAt,
      pages,
      breakpoints: parseBuildEntriesById(build, "breakpoints"),
      styles: parseBuildStyleEntries(build),
      styleSources: parseBuildEntriesById(build, "styleSources"),
      styleSourceSelections: parseBuildStyleSourceSelectionEntries(build),
      props: parseBuildEntriesById(build, "props"),
      instances: parseBuildEntriesById(build, "instances"),
      dataSources: parseBuildEntriesById(build, "dataSources"),
      resources: parseBuildEntriesById(build, "resources"),
    },
  };
};

export const expectGeneratedAppBuild = async ({
  projectId,
  expectedText,
}: {
  projectId: string;
  expectedText?: string;
}) => {
  const tempDir = await mkdtemp(join(tmpdir(), "webstudio-e2e-generated-"));
  try {
    const build = await loadDevBuild({ projectId });
    await mkdir(join(tempDir, ".webstudio"), { recursive: true });
    await writeFile(
      join(tempDir, ".webstudio", "data.json"),
      `${JSON.stringify(createLocalBundleFromDevBuild(build), undefined, 2)}\n`
    );

    await execFileAsync(
      process.execPath,
      [cliLocalPath, "build", "--assets", "false", "--template", "defaults"],
      {
        cwd: tempDir,
        env: { ...process.env, PWD: tempDir },
        maxBuffer: 1024 * 1024 * 10,
      }
    );

    if (expectedText !== undefined) {
      const generatedHome = await readFile(
        join(tempDir, "app", "__generated__", "_index.tsx"),
        "utf8"
      );
      if (generatedHome.includes(expectedText) === false) {
        throw new Error(
          `Expected generated home route to include "${expectedText}".`
        );
      }
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
};

const withGeneratedPreview = async <Result>({
  projectId,
  callback,
}: {
  projectId: string;
  callback: ({ url, html }: { url: string; html: string }) => Promise<Result>;
}) => {
  const tempDir = await mkdtemp(join(tmpdir(), "webstudio-e2e-generated-"));
  let preview: ChildProcess | undefined;
  try {
    const build = await loadDevBuild({ projectId });
    await mkdir(join(tempDir, ".webstudio"), { recursive: true });
    await writeFile(
      join(tempDir, ".webstudio", "data.json"),
      `${JSON.stringify(createLocalBundleFromDevBuild(build), undefined, 2)}\n`
    );

    const port = await getAvailablePort();
    const output: string[] = [];
    preview = spawn(
      process.execPath,
      [
        cliLocalPath,
        "preview",
        "--assets",
        "false",
        "--template",
        "defaults",
        "--template",
        "react-router",
        "--host",
        "127.0.0.1",
        "--port",
        String(port),
      ],
      {
        cwd: tempDir,
        detached: process.platform !== "win32",
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, PWD: tempDir },
      }
    );
    const appendOutput = (chunk: unknown) => {
      output.push(String(chunk));
      while (output.join("").length > 8_000) {
        output.shift();
      }
    };
    preview.stdout?.on("data", appendOutput);
    preview.stderr?.on("data", appendOutput);

    const url = `http://127.0.0.1:${port}/`;
    const html = await waitForGeneratedPreview({
      process: preview,
      url,
      output: () => output.join(""),
    });
    return await callback({ url, html });
  } finally {
    if (preview !== undefined) {
      // The CLI starts npm and the generated server below it.
      await stopChildProcess(preview, { killGroup: true });
    }
    await rm(tempDir, { recursive: true, force: true });
  }
};

export const expectGeneratedAppToRender = async ({
  projectId,
  expectedText,
  path = "/",
}: {
  projectId: string;
  expectedText: string;
  path?: string;
}) => {
  await withGeneratedPreview({
    projectId,
    callback: async ({ url, html }) => {
      const response =
        path === "/"
          ? undefined
          : await fetch(new URL(path, url), { redirect: "manual" });
      const routeHtml = response === undefined ? html : await response.text();
      if (
        (response !== undefined && response.ok === false) ||
        routeHtml.includes(expectedText) === false
      ) {
        throw new Error(
          `Expected generated preview route ${JSON.stringify(path)} at ${url} to render ${JSON.stringify(expectedText)}.`
        );
      }
    },
  });
};

export const expectGeneratedAppRedirect = async ({
  projectId,
  path,
  status,
  location,
}: {
  projectId: string;
  path: string;
  status: number;
  location: string;
}) => {
  await withGeneratedPreview({
    projectId,
    callback: async ({ url }) => {
      const response = await fetch(new URL(path, url), {
        redirect: "manual",
      });
      const actualLocation = response.headers.get("location");
      if (response.status !== status || actualLocation !== location) {
        throw new Error(
          `Expected generated preview redirect ${JSON.stringify(path)} to return ${status} with location ${JSON.stringify(location)}. Received ${response.status} with location ${JSON.stringify(actualLocation)}.`
        );
      }
    },
  });
};

export const expectGeneratedAppNavigation = async ({
  projectId,
  page,
  linkText,
  targetPath,
}: {
  projectId: string;
  page: PlaywrightPage;
  linkText: string;
  targetPath: string;
}) => {
  await withGeneratedPreview({
    projectId,
    callback: async ({ url }) => {
      const targetUrl = new URL(targetPath, url).toString();
      await page.goto(url);
      await page.getByRole("link", { name: linkText, exact: true }).click();
      await page.waitForURL(targetUrl);
      const activeLink = page.getByRole("link", {
        name: linkText,
        exact: true,
      });
      try {
        await activeLink.waitFor({ state: "visible" });
        await page.waitForFunction(
          ({ linkText }) =>
            Array.from(document.querySelectorAll("a")).some(
              (link) =>
                link.textContent?.trim() === linkText &&
                link.getAttribute("aria-current") === "page"
            ),
          { linkText },
          { timeout: 10_000 }
        );
      } catch {
        const ariaCurrent = await activeLink.getAttribute("aria-current");
        throw new Error(
          `Expected generated preview link ${JSON.stringify(linkText)} to be active after navigating to ${JSON.stringify(targetPath)}. Received aria-current=${JSON.stringify(ariaCurrent)}.`
        );
      }
    },
  });
};

export const expectGeneratedRedirects = async ({
  projectId,
  expectedRedirects,
}: {
  projectId: string;
  expectedRedirects: Array<{ old: string; new: string; status?: string }>;
}) => {
  const tempDir = await mkdtemp(join(tmpdir(), "webstudio-e2e-generated-"));
  try {
    const build = await loadDevBuild({ projectId });
    await mkdir(join(tempDir, ".webstudio"), { recursive: true });
    await writeFile(
      join(tempDir, ".webstudio", "data.json"),
      `${JSON.stringify(createLocalBundleFromDevBuild(build), undefined, 2)}\n`
    );

    await execFileAsync(
      process.execPath,
      [cliLocalPath, "build", "--assets", "false", "--template", "defaults"],
      {
        cwd: tempDir,
        env: { ...process.env, PWD: tempDir },
        maxBuffer: 1024 * 1024 * 10,
      }
    );

    const redirectsModule = await readFile(
      join(tempDir, "app", "__generated__", "$resources.redirects.ts"),
      "utf8"
    );
    const redirectsExport = redirectsModule.trim();
    const prefix = "export const redirects = ";
    const suffix = ";";
    if (
      redirectsExport.startsWith(prefix) === false ||
      redirectsExport.endsWith(suffix) === false
    ) {
      throw new Error(
        `Expected generated redirects module to export redirects. Received ${redirectsModule}`
      );
    }
    const redirectsJson = redirectsExport.slice(prefix.length, -suffix.length);
    const redirects = JSON.parse(redirectsJson);
    if (JSON.stringify(redirects) !== JSON.stringify(expectedRedirects)) {
      throw new Error(
        `Expected generated redirects ${JSON.stringify(
          expectedRedirects
        )}, received ${JSON.stringify(redirects)}.`
      );
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
};
