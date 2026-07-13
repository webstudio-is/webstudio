import {
  spawn,
  type ChildProcess,
  type StdioOptions,
} from "node:child_process";
import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { delimiter, dirname, join, parse } from "node:path";

export type PreviewServerOptions = {
  host: string;
  port: number;
  cwd?: string;
  imageDomains?: string[];
};

export type PreviewServerResult = {
  url: string;
  process: ChildProcess;
};

export type PreviewServerDependencies = {
  spawn: typeof spawn;
  fetch: typeof fetch;
  cp: typeof cp;
  mkdir: typeof mkdir;
  readdir: typeof readdir;
  readFile: typeof readFile;
  writeFile: typeof writeFile;
  sleep: (ms: number) => Promise<void>;
  platform: typeof process.platform;
};

export const defaultPreviewServerDependencies: PreviewServerDependencies = {
  spawn,
  fetch,
  cp,
  mkdir,
  readdir,
  readFile,
  writeFile,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  platform: process.platform,
};

const processEnv = () => process.env;

const pathKey = () => (process.platform === "win32" ? "Path" : "PATH");

const getAncestorBinPaths = (directory: string) => {
  const paths: string[] = [];
  let currentDirectory = directory;
  while (true) {
    paths.push(join(currentDirectory, "node_modules", ".bin"));
    paths.push(
      join(currentDirectory, "node_modules", ".pnpm", "node_modules", ".bin")
    );
    const parentDirectory = dirname(currentDirectory);
    if (
      parentDirectory === currentDirectory ||
      currentDirectory === parse(currentDirectory).root
    ) {
      return paths;
    }
    currentDirectory = parentDirectory;
  }
};

const getPreviewEnv = (
  cwd: string | undefined,
  extraEnv: NodeJS.ProcessEnv
) => {
  if (cwd === undefined) {
    return extraEnv;
  }
  const key = pathKey();
  return {
    ...extraEnv,
    [key]: [...getAncestorBinPaths(cwd), extraEnv[key]]
      .filter(Boolean)
      .join(delimiter),
  };
};

export const getPreviewUrl = ({
  host,
  port,
  path = "/",
}: PreviewServerOptions & { path?: string }) =>
  new URL(path, `http://${host}:${port}`).toString();

export const getPreviewBuildArgs = () => ["run", "build"];

export const getPreviewStartArgs = (_options: PreviewServerOptions) => [
  "run",
  "start",
];

export const getPreviewCommand = (
  platform: typeof process.platform = process.platform
) => (platform === "win32" ? "npm.cmd" : "npm");

export const runPreviewBuild = async (
  dependencies = defaultPreviewServerDependencies,
  cwd?: string,
  stdio: StdioOptions = "inherit"
) => {
  const buildProcess = dependencies.spawn(
    getPreviewCommand(dependencies.platform),
    getPreviewBuildArgs(),
    {
      cwd,
      stdio,
      env: getPreviewEnv(cwd, {
        ...processEnv(),
        NODE_ENV: "production",
      }),
    }
  );
  let output = "";
  const appendOutput = (chunk: unknown) => {
    output = `${output}${String(chunk)}`.slice(-4000);
  };
  buildProcess.stdout?.on("data", appendOutput);
  buildProcess.stderr?.on("data", appendOutput);
  try {
    await waitForPreviewExit(buildProcess);
    await materializePreviewAssets(cwd, dependencies);
  } catch (error) {
    if (output.length === 0) {
      throw error;
    }
    throw new Error(
      `${error instanceof Error ? error.message : String(error)}\n\nPreview build output:\n${output}`,
      { cause: error }
    );
  }
};

export const materializePreviewAssets = async (
  cwd: string | undefined,
  dependencies = defaultPreviewServerDependencies
) => {
  if (cwd === undefined) {
    return;
  }
  const source = join(cwd, "public", "assets");
  const destination = join(cwd, "build", "client", "assets");
  try {
    await dependencies.mkdir(destination, { recursive: true });
    await dependencies.cp(source, destination, {
      recursive: true,
      force: true,
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return;
    }
    throw error;
  }
};

export const startPreviewServer = (
  options: PreviewServerOptions & { stdio?: StdioOptions },
  dependencies = defaultPreviewServerDependencies
): PreviewServerResult => {
  const previewProcess = dependencies.spawn(
    getPreviewCommand(dependencies.platform),
    getPreviewStartArgs(options),
    {
      cwd: options.cwd,
      stdio: options.stdio ?? "inherit",
      env: getPreviewEnv(options.cwd, {
        ...processEnv(),
        HOST: options.host,
        PORT: String(options.port),
        ...(options.imageDomains === undefined
          ? {}
          : { DOMAINS: options.imageDomains.join(",") }),
        NODE_ENV: "production",
      }),
    }
  );
  return {
    url: getPreviewUrl(options),
    process: previewProcess,
  };
};

export const waitForPreviewExit = async (process: ChildProcess) => {
  const code = await new Promise<number | null>((resolve, reject) => {
    process.once("error", reject);
    process.once("exit", resolve);
  });
  if (code !== 0 && code !== null) {
    throw new Error(`Preview server exited with code ${code}.`);
  }
};

export type PreviewControllerResult = {
  url: string;
  pid?: number;
  running: boolean;
};

type PreviewControllerStartOptions = Partial<PreviewServerOptions> & {
  restart?: boolean;
  buildCacheKey?: string;
};

const areStringArraysEqual = (
  left: string[] | undefined,
  right: string[] | undefined
) =>
  left === right ||
  (left !== undefined &&
    right !== undefined &&
    left.length === right.length &&
    left.every((value, index) => value === right[index]));

export const previewBuildCacheMarker = ".webstudio-preview-build";

const getPreviewProjectId = async (
  cwd: string | undefined,
  dependencies = defaultPreviewServerDependencies
) => {
  if (cwd === undefined) {
    return undefined;
  }
  try {
    const data = JSON.parse(
      await dependencies.readFile(join(cwd, ".webstudio", "data.json"), "utf8")
    ) as { build?: { projectId?: unknown } };
    if (typeof data.build?.projectId !== "string") {
      throw new Error("projectId is missing");
    }
    return data.build.projectId;
  } catch (error) {
    throw new Error(
      `Could not identify the generated preview project in ${join(cwd, ".webstudio", "data.json")}.`,
      { cause: error }
    );
  }
};

const hasProjectMarker = (html: string, projectId: string) => {
  const escapedProjectId = projectId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `data-ws-project\\s*=\\s*(["'])${escapedProjectId}\\1`
  ).test(html);
};

export const waitForPreviewReady = async (
  url: string,
  {
    timeoutMs = 30_000,
    intervalMs = 250,
    isRunning,
    requiredAssetNames = [],
    requiredProjectId,
  }: {
    timeoutMs?: number;
    intervalMs?: number;
    isRunning?: () => boolean;
    requiredAssetNames?: string[];
    requiredProjectId?: string;
  } = {},
  dependencies = defaultPreviewServerDependencies
) => {
  const deadline = Date.now() + timeoutMs;
  let sawStaleServer = false;
  let sawUnexpectedProject = false;
  while (Date.now() <= deadline) {
    if (isRunning?.() === false) {
      throw new Error(
        `Preview server exited before it became ready at ${url}.`
      );
    }
    try {
      const attemptTimeoutMs = Math.max(
        1,
        Math.min(5000, deadline - Date.now())
      );
      const response = await dependencies.fetch(url, {
        method: "GET",
        signal: AbortSignal.timeout(attemptTimeoutMs),
      });
      if (response.status < 500) {
        if (
          requiredAssetNames.length === 0 &&
          requiredProjectId === undefined
        ) {
          return;
        }
        const html = await response.text();
        const servesExpectedProject =
          requiredProjectId === undefined ||
          hasProjectMarker(html, requiredProjectId);
        const servesLatestAssets =
          requiredAssetNames.length === 0 ||
          requiredAssetNames.some((name) => html.includes(name));
        if (servesExpectedProject && servesLatestAssets) {
          return;
        }
        sawUnexpectedProject ||= servesExpectedProject === false;
        sawStaleServer ||= servesLatestAssets === false;
      }
    } catch {
      // Server is still starting.
    }
    await dependencies.sleep(intervalMs);
  }
  if (sawUnexpectedProject) {
    throw new Error(
      `Preview server at ${url} did not serve the expected generated project. Stop the existing preview server on this port, then retry.`
    );
  }
  if (sawStaleServer) {
    throw new Error(
      `Preview server at ${url} did not serve the latest build assets. Stop the existing preview server on this port, then retry.`
    );
  }
  throw new Error(`Preview server did not become ready at ${url}.`);
};

const getPreviewCssAssetNames = async (
  cwd: string | undefined,
  dependencies = defaultPreviewServerDependencies
) => {
  if (cwd === undefined) {
    return [];
  }
  try {
    return (await dependencies.readdir(join(cwd, "build", "client", "assets")))
      .filter((name) => name.endsWith(".css"))
      .sort();
  } catch {
    return [];
  }
};

const formatPreviewServerStartupError = ({
  message,
  output,
  url,
}: {
  message: string;
  output: string;
  url: string;
}) => {
  const portHint = output.includes("EADDRINUSE")
    ? `\n\nPort is already in use. Stop the existing preview server for ${url}, or start preview with a different port.`
    : "";
  return `${message}\n\nPreview server output:\n${output}${portHint}`;
};

export const createPreviewController = (
  defaults: PreviewServerOptions,
  dependencies = defaultPreviewServerDependencies
) => {
  let server: PreviewServerResult | undefined;
  let currentOptions = defaults;
  let currentCwd = defaults.cwd;
  let serverOutput = "";
  const appendServerOutput = (chunk: unknown) => {
    serverOutput = `${serverOutput}${String(chunk)}`.slice(-4000);
  };
  const isRunning = () =>
    server !== undefined &&
    server.process.killed === false &&
    server.process.exitCode === null &&
    server.process.signalCode === null;
  const getStatus = (): PreviewControllerResult => ({
    url: getPreviewUrl(currentOptions),
    pid: server?.process.pid,
    running: isRunning(),
  });
  const stop = async () => {
    if (server === undefined) {
      return;
    }
    const process = server.process;
    server = undefined;
    if (
      process.killed ||
      process.exitCode !== null ||
      process.signalCode !== null
    ) {
      return;
    }
    await new Promise<void>((resolve, reject) => {
      process.once("error", reject);
      process.once("exit", () => resolve());
      if (process.kill() === false) {
        resolve();
      }
    });
  };
  const start = async (
    options: PreviewControllerStartOptions = {}
  ): Promise<PreviewControllerResult> => {
    const running = isRunning();
    const nextOptions = {
      host: options.host ?? (running ? currentOptions.host : defaults.host),
      port: options.port ?? (running ? currentOptions.port : defaults.port),
      cwd: options.cwd ?? (running ? currentCwd : defaults.cwd),
      imageDomains:
        options.imageDomains ??
        (running ? currentOptions.imageDomains : defaults.imageDomains),
    };
    if (running) {
      if (options.restart !== true) {
        if (
          nextOptions.host !== currentOptions.host ||
          nextOptions.port !== currentOptions.port ||
          nextOptions.cwd !== currentCwd ||
          areStringArraysEqual(
            nextOptions.imageDomains,
            currentOptions.imageDomains
          ) === false
        ) {
          throw new Error(
            `Preview server is already running at ${getPreviewUrl(currentOptions)}. Stop it before starting a different preview server.`
          );
        }
        return getStatus();
      }
      await stop();
    }
    currentOptions = nextOptions;
    currentCwd = nextOptions.cwd;
    const cachedBuildKey =
      options.buildCacheKey === undefined || currentCwd === undefined
        ? undefined
        : await dependencies
            .readFile(join(currentCwd, previewBuildCacheMarker), "utf8")
            .catch(() => undefined);
    if (
      options.buildCacheKey === undefined ||
      cachedBuildKey !== options.buildCacheKey
    ) {
      await runPreviewBuild(dependencies, currentCwd, [
        "ignore",
        "pipe",
        "pipe",
      ]);
      if (options.buildCacheKey !== undefined && currentCwd !== undefined) {
        await dependencies.writeFile(
          join(currentCwd, previewBuildCacheMarker),
          options.buildCacheKey
        );
      }
    }
    serverOutput = "";
    server = startPreviewServer(
      {
        ...nextOptions,
        stdio: ["ignore", "pipe", "pipe"],
      },
      dependencies
    );
    server.process.stdout?.on("data", appendServerOutput);
    server.process.stderr?.on("data", appendServerOutput);
    server.process.once("exit", () => {
      server = undefined;
    });
    return getStatus();
  };
  return {
    start,
    async startAndWait(
      options: PreviewControllerStartOptions = {}
    ): Promise<PreviewControllerResult> {
      const nextCwd = options.cwd ?? (isRunning() ? currentCwd : defaults.cwd);
      const requiredProjectId = await getPreviewProjectId(
        nextCwd,
        dependencies
      );
      const result = await start(options);
      const requiredAssetNames = await getPreviewCssAssetNames(
        currentCwd,
        dependencies
      );
      try {
        await waitForPreviewReady(
          result.url,
          { isRunning, requiredAssetNames, requiredProjectId },
          dependencies
        );
      } catch (error) {
        const output = serverOutput.trim();
        if (output !== "" && error instanceof Error) {
          throw new Error(
            formatPreviewServerStartupError({
              message: error.message,
              output,
              url: result.url,
            })
          );
        }
        throw error;
      }
      return result;
    },
    async stop(): Promise<PreviewControllerResult> {
      await stop();
      return getStatus();
    },
    status: getStatus,
    resolveUrl(path = "/") {
      return getPreviewUrl({ ...currentOptions, path });
    },
  };
};
