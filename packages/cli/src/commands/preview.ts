import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import {
  access,
  copyFile,
  lstat,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { chdir, cwd } from "node:process";
import { promisify } from "node:util";
import { log } from "@clack/prompts";
import { builderNamespaces } from "@webstudio-is/project-build/contracts";
import { prebuild } from "../prebuild";
import { LOCAL_CONFIG_FILE, LOCAL_DATA_FILE } from "../config";
import { HandledCliError } from "../errors";
import {
  getPreviewUrl,
  previewBuildCacheMarker,
  runPreviewBuild,
  startPreviewServer,
  waitForPreviewExit,
} from "../preview-server";
import type {
  CommonYargsArgv,
  StrictYargsOptionsToInterface,
} from "./yargs-types";
import { buildOptions } from "./build";
import { sync, defaultSyncDependencies, type SyncDependencies } from "./sync";
import { resolveApiConnection } from "../api-connection";
import {
  createCliProjectSession,
  writeCliProjectSessionDataFile,
} from "../project-session";
import { LOCAL_ASSETS_DIR } from "../asset-files";
import packageJson from "../../package.json" with { type: "json" };

export const previewDefaultTemplate = ["defaults", "react-router"] as const;
export const previewSources = ["local", "session"] as const;
export type PreviewSource = (typeof previewSources)[number];

const getPreviewTemplates = (template: string[]) => {
  const templates =
    template.length === 0 ? [...previewDefaultTemplate] : [...template];
  if (
    templates.includes("react-router") &&
    templates.includes("defaults") === false
  ) {
    templates.unshift("defaults");
  }
  return templates;
};

export const previewOptions = (yargs: CommonYargsArgv) =>
  buildOptions(yargs)
    .option("host", {
      type: "string",
      default: "127.0.0.1",
      describe: "Host used by the generated project production preview server",
    })
    .option("port", {
      type: "number",
      default: 5173,
      describe: "Port used by the generated project production preview server",
    })
    .option("image-domain", {
      type: "string",
      array: true,
      describe:
        "External image hostname allowed by the generated preview optimizer; repeat for multiple hosts",
    })
    .option("generate", {
      type: "boolean",
      default: true,
      describe:
        "Regenerate project files from .webstudio/data.json before building and starting preview",
    })
    .option("source", {
      type: "string",
      choices: previewSources,
      default: "local" satisfies PreviewSource,
      describe:
        "Project data source for generation: local uses .webstudio/data.json; session materializes the current ProjectSession snapshot first",
    })
    .example(
      "webstudio preview --port 5173",
      "Regenerate React Router app files, build them, and start the generated site at http://127.0.0.1:5173"
    )
    .example(
      "webstudio preview --template react-router --port 5173",
      "Regenerate files, build them, and start the generated site at http://127.0.0.1:5173"
    )
    .example(
      "webstudio preview --template react-router --generate false",
      "Build and start an already generated React Router app without rewriting project files"
    )
    .epilogue(
      [
        "Preview builds the generated app and starts its production server.",
        "Preview dependencies are isolated under .webstudio/preview and reused across regenerations.",
        "Do not add generated-preview dependencies to the repository root package.json or pnpm-lock.yaml.",
        "If dependency installation fails, check npm and network configuration, then reinstall or update the Webstudio CLI if the problem persists.",
      ].join("\n")
    );

type PreviewOptions = StrictYargsOptionsToInterface<typeof previewOptions>;

const isPositivePort = (value: number) =>
  Number.isInteger(value) && value > 0 && value <= 65535;

export const validatePreviewServerOptions = ({
  host,
  port,
  imageDomains,
}: {
  host: string;
  port: number;
  imageDomains?: string[];
}) => {
  if (host.length === 0) {
    throw new Error("--host must not be empty.");
  }
  if (isPositivePort(port) === false) {
    throw new Error("--port must be an integer between 1 and 65535.");
  }
  if (
    imageDomains?.some(
      (domain) => /^[a-z0-9.-]+(?::\d+)?$/i.test(domain) === false
    )
  ) {
    throw new Error(
      "Image domains must be hostnames without a protocol or path."
    );
  }
};

const createSilentSpinner = () => ({
  start: () => undefined,
  message: () => undefined,
  stop: () => undefined,
});

const localPreviewFiles = [
  LOCAL_CONFIG_FILE,
  LOCAL_DATA_FILE,
  ".webstudio/auth.json",
];

export const getNodeModulesSearchPaths = (moduleUrl: string) =>
  createRequire(moduleUrl).resolve.paths("webstudio-preview") ?? [];

const cliNodeModulesCandidates = getNodeModulesSearchPaths(import.meta.url);
const execFileAsync = promisify(execFile);
const dependencyMarker = ".webstudio-preview-dependencies";
const developmentCliVersion = "0.0.0-webstudio-version";
type PreviewDependencyOperations = {
  access: (path: string) => Promise<void>;
  execFile: (
    file: string,
    args: string[],
    options: { cwd: string }
  ) => Promise<unknown>;
  lstat: (path: string) => Promise<{ isSymbolicLink: () => boolean }>;
  readFile: (path: string, encoding: "utf8") => Promise<string>;
  rm: (
    path: string,
    options: { recursive: true; force: true }
  ) => Promise<void>;
  symlink: (
    target: string,
    path: string,
    type: "dir" | "junction"
  ) => Promise<void>;
  writeFile: (path: string, data: string) => Promise<void>;
  platform: NodeJS.Platform;
};

export const getPreviewProjectDir = (projectDir = cwd()) =>
  join(projectDir, ".webstudio", "preview");

export const ensurePreviewDependencies = async (
  previewProjectDir: string,
  dependencies: Partial<PreviewDependencyOperations> = {}
) => {
  const operations: PreviewDependencyOperations = {
    access,
    execFile: execFileAsync,
    lstat,
    readFile,
    rm,
    symlink,
    writeFile,
    platform: process.platform,
    ...dependencies,
  };
  const previewNodeModules = join(previewProjectDir, "node_modules");
  const packageJson = JSON.parse(
    await operations.readFile(join(previewProjectDir, "package.json"), "utf8")
  ) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const requiredDependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };
  const manifestHash = createHash("sha256")
    .update(JSON.stringify(requiredDependencies))
    .digest("hex");
  const hasRequiredDependencies = async (nodeModules: string) => {
    try {
      await Promise.all(
        Object.keys(requiredDependencies).map((name) =>
          operations.access(join(nodeModules, name, "package.json"))
        )
      );
      return true;
    } catch {
      return false;
    }
  };

  try {
    const previewNodeModulesStat = await operations.lstat(previewNodeModules);
    if (
      previewNodeModulesStat.isSymbolicLink() &&
      (await hasRequiredDependencies(previewNodeModules))
    ) {
      return;
    }
    if (previewNodeModulesStat.isSymbolicLink() === false) {
      const installedHash = await operations
        .readFile(join(previewNodeModules, dependencyMarker), "utf8")
        .catch(() => "");
      if (
        installedHash === manifestHash &&
        (await hasRequiredDependencies(previewNodeModules))
      ) {
        return;
      }
    }
    await operations.rm(previewNodeModules, { recursive: true, force: true });
  } catch {
    // Continue with the CLI dependency tree or an isolated install.
  }

  for (const cliNodeModules of cliNodeModulesCandidates) {
    if (await hasRequiredDependencies(cliNodeModules)) {
      await operations.symlink(
        cliNodeModules,
        previewNodeModules,
        operations.platform === "win32" ? "junction" : "dir"
      );
      return;
    }
  }

  try {
    await operations.execFile(
      operations.platform === "win32" ? "npm.cmd" : "npm",
      [
        "install",
        "--legacy-peer-deps",
        "--no-audit",
        "--no-fund",
        "--package-lock=false",
        "--loglevel=error",
      ],
      { cwd: previewProjectDir }
    );
  } catch (error) {
    throw new Error(
      "PREVIEW_DEPENDENCY_INSTALL_FAILED: Could not install the generated preview dependencies. Check the npm/network configuration, then reinstall or update webstudio if the problem persists.",
      { cause: error }
    );
  }
  if ((await hasRequiredDependencies(previewNodeModules)) === false) {
    throw new Error(
      "PREVIEW_DEPENDENCIES_MISSING: npm completed without installing every dependency declared by the generated preview. Reinstall or update webstudio, then retry."
    );
  }
  await operations.writeFile(
    join(previewNodeModules, dependencyMarker),
    manifestHash
  );
};

const runInDirectory = async <Result>(
  directory: string,
  callback: () => Promise<Result>
) => {
  const previousDirectory = cwd();
  chdir(directory);
  try {
    return await callback();
  } finally {
    chdir(previousDirectory);
  }
};

let runInDirectoryQueue = Promise.resolve();

const runExclusive = async <Result>(callback: () => Promise<Result>) => {
  const previousRun = runInDirectoryQueue;
  let releaseCurrentRun: () => void = () => undefined;
  runInDirectoryQueue = new Promise((resolve) => {
    releaseCurrentRun = resolve;
  });
  await previousRun.catch(() => undefined);
  try {
    return await callback();
  } finally {
    releaseCurrentRun();
  }
};

const preparePreviewDirectory = async (projectDir: string) => {
  const previewProjectDir = getPreviewProjectDir(projectDir);
  await mkdir(previewProjectDir, { recursive: true });
  const entries = await readdir(previewProjectDir);
  await Promise.all(
    entries
      .filter((entry) => entry !== "node_modules")
      .map((entry) =>
        rm(join(previewProjectDir, entry), { recursive: true, force: true })
      )
  );
  await mkdir(join(previewProjectDir, ".webstudio"), { recursive: true });
  for (const file of localPreviewFiles) {
    await copyFile(join(projectDir, file), join(previewProjectDir, file)).catch(
      (error) => {
        if (
          error instanceof Error &&
          "code" in error &&
          error.code === "ENOENT"
        ) {
          return;
        }
        throw error;
      }
    );
  }
  return previewProjectDir;
};

const getAssetFileMetadata = async (
  directory: string,
  relativeDirectory = ""
): Promise<string[]> => {
  const entries = await readdir(join(directory, relativeDirectory), {
    withFileTypes: true,
  }).catch(() => []);
  const metadata: string[] = [];
  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name)
  )) {
    const relativePath = join(relativeDirectory, entry.name);
    if (entry.isDirectory()) {
      metadata.push(...(await getAssetFileMetadata(directory, relativePath)));
      continue;
    }
    if (entry.isFile()) {
      const file = await stat(join(directory, relativePath));
      metadata.push(`${relativePath}:${file.size}:${file.mtimeMs}`);
    }
  }
  return metadata;
};

export const getPreviewBuildCacheKey = async ({
  projectDir,
  assets,
  template,
  includeDraftPages = false,
  cliVersion = packageJson.version,
}: {
  projectDir: string;
  assets: boolean;
  template: string[];
  includeDraftPages?: boolean;
  cliVersion?: string;
}) => {
  if (cliVersion === developmentCliVersion) {
    return;
  }
  const hash = createHash("sha256");
  hash.update(
    JSON.stringify({
      version: 1,
      cliVersion,
      assets,
      template: getPreviewTemplates(template),
      includeDraftPages,
    })
  );
  for (const file of localPreviewFiles) {
    hash.update(file);
    hash.update(
      await readFile(join(projectDir, file), "utf8").catch(() => "<missing>")
    );
  }
  if (assets) {
    hash.update(
      JSON.stringify(
        await getAssetFileMetadata(join(projectDir, LOCAL_ASSETS_DIR))
      )
    );
  }
  return hash.digest("hex");
};

export const preparePreviewProject = async ({
  assets,
  template,
  generate,
  source = "local",
  syncIfMissing = false,
  syncDependencies = defaultSyncDependencies,
  accessLocalDataFile = access,
  prebuildProject = prebuild,
  ensureDependencies = ensurePreviewDependencies,
  getBuildCacheKey = getPreviewBuildCacheKey,
  silent = false,
  includeDraftPages = false,
  prepareSessionDataFile = async () => {
    const connection = await resolveApiConnection();
    const session = createCliProjectSession({ connection });
    await session.initialize();
    const snapshot = await session.ensureNamespaces(builderNamespaces);
    await writeCliProjectSessionDataFile(snapshot, undefined, {
      origin: connection.origin,
    });
  },
}: {
  assets: boolean;
  template: string[];
  generate: boolean;
  source?: PreviewSource;
  syncIfMissing?: boolean;
  syncDependencies?: SyncDependencies;
  accessLocalDataFile?: typeof access;
  prebuildProject?: typeof prebuild;
  ensureDependencies?: typeof ensurePreviewDependencies;
  getBuildCacheKey?: typeof getPreviewBuildCacheKey;
  silent?: boolean;
  includeDraftPages?: boolean;
  prepareSessionDataFile?: () => Promise<void>;
}): Promise<{
  cwd: string;
  buildCacheKey?: string;
  buildRequired?: boolean;
}> => {
  const projectDir = cwd();
  if (source === "session") {
    await prepareSessionDataFile();
  }
  try {
    await accessLocalDataFile(LOCAL_DATA_FILE);
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      if (syncIfMissing) {
        await sync(
          {},
          {
            ...syncDependencies,
            spinner: createSilentSpinner,
          }
        );
      } else {
        log.error(
          "You need to link and sync a Webstudio project before previewing it. Run `webstudio link` and `webstudio sync` first."
        );
        throw new HandledCliError();
      }
    } else {
      throw error;
    }
  }

  const previewProjectDir = getPreviewProjectDir(projectDir);
  if (generate === false) {
    return { cwd: projectDir };
  }

  const buildCacheKey = await getBuildCacheKey({
    projectDir,
    assets,
    template,
    includeDraftPages,
  });
  if (buildCacheKey !== undefined) {
    const cachedBuildKey = await readFile(
      join(previewProjectDir, previewBuildCacheMarker),
      "utf8"
    ).catch(() => undefined);
    if (cachedBuildKey === buildCacheKey) {
      await ensureDependencies(previewProjectDir);
      return { cwd: previewProjectDir, buildCacheKey, buildRequired: false };
    }
  }

  if (generate) {
    await runExclusive(async () => {
      await preparePreviewDirectory(projectDir);
      await runInDirectory(previewProjectDir, async () => {
        await prebuildProject({
          assets,
          template: getPreviewTemplates(template),
          ...(silent ? { silent: true } : {}),
          ...(includeDraftPages ? { includeDraftPages: true } : {}),
        });
      });
      await ensureDependencies(previewProjectDir);
    });
  }

  return {
    cwd: previewProjectDir,
    buildRequired: true,
    ...(buildCacheKey === undefined ? {} : { buildCacheKey }),
  };
};

export const buildPreparedPreview = async (
  previewProject: {
    cwd: string;
    buildCacheKey?: string;
    buildRequired?: boolean;
  },
  dependencies = { runPreviewBuild, writeFile }
) => {
  if (previewProject.buildRequired === false) {
    return false;
  }
  await dependencies.runPreviewBuild(undefined, previewProject.cwd);
  if (previewProject.buildCacheKey !== undefined) {
    await dependencies.writeFile(
      join(previewProject.cwd, previewBuildCacheMarker),
      previewProject.buildCacheKey
    );
  }
  return true;
};

export const preview = async (options: PreviewOptions) => {
  validatePreviewServerOptions({
    ...options,
    imageDomains: options.imageDomain,
  });
  const previewProject = await preparePreviewProject({
    assets: options.assets,
    template: options.template,
    generate: options.generate,
    source: options.source as PreviewSource,
  });

  const url = getPreviewUrl({ host: options.host, port: options.port });
  log.success(`Preview production server starting at ${url}`);
  await buildPreparedPreview(previewProject);
  const server = startPreviewServer({
    host: options.host,
    port: options.port,
    cwd: previewProject.cwd,
    imageDomains: options.imageDomain,
  });
  await waitForPreviewExit(server.process);
};
