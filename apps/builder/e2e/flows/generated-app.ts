import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { bundleVersion } from "@webstudio-is/protocol";
import { getStyleDeclKey, type Page } from "@webstudio-is/sdk";
import { loadDevBuild } from "../db";

const execFileAsync = promisify(execFile);
const cliLocalPath = fileURLToPath(
  new URL("../../../../packages/cli/local.js", import.meta.url)
);

type BuildRow = Awaited<ReturnType<typeof loadDevBuild>>;

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
  expectedText: string;
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

    const generatedHome = await readFile(
      join(tempDir, "app", "__generated__", "_index.tsx"),
      "utf8"
    );
    if (generatedHome.includes(expectedText) === false) {
      throw new Error(
        `Expected generated home route to include "${expectedText}".`
      );
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
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
