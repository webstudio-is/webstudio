import {
  execFile,
  spawn,
  type ChildProcess,
  type StdioOptions,
} from "node:child_process";
import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, delimiter, dirname, join, parse, win32 } from "node:path";
import detectPort from "detect-port";
import getPort from "get-port";
import pathKey from "path-key";
import { parse as parseHtml, type DefaultTreeAdapterMap } from "parse5";
import type { ProjectPreviewMode } from "@webstudio-is/project-build/preview";

export type PreviewMode = ProjectPreviewMode;

export type PreviewServerOptions = {
  host: string;
  port: number;
  mode?: PreviewMode;
  cwd?: string;
  imageDomains?: string[];
};

export type PreviewServerResult = {
  url: string;
  process: ChildProcess;
};

export type PreviewServerDependencies = {
  spawn: typeof spawn;
  killProcess: (pid: number, signal: NodeJS.Signals) => boolean;
  killWindowsProcessTree: (pid: number) => Promise<boolean>;
  parentProcess: {
    pid: number;
    once: (signal: NodeJS.Signals, handler: () => void) => unknown;
    off: (signal: NodeJS.Signals, handler: () => void) => unknown;
    kill: (pid: number, signal: NodeJS.Signals) => boolean;
  };
  fetch: typeof fetch;
  cp: typeof cp;
  mkdir: typeof mkdir;
  readdir: typeof readdir;
  readFile: typeof readFile;
  writeFile: typeof writeFile;
  sleep: (ms: number) => Promise<void>;
  nodeExecPath: string;
  npmExecPath?: string;
  platform: typeof process.platform;
};

export const defaultPreviewServerDependencies: PreviewServerDependencies = {
  spawn,
  killProcess: process.kill,
  killWindowsProcessTree: (pid) =>
    new Promise((resolve, reject) => {
      execFile(
        "taskkill.exe",
        ["/pid", String(pid), "/T", "/F"],
        { windowsHide: true },
        (error) => {
          if (error === null) {
            resolve(true);
            return;
          }
          if (error.code === 128) {
            resolve(false);
            return;
          }
          reject(error);
        }
      );
    }),
  parentProcess: process,
  fetch,
  cp,
  mkdir,
  readdir,
  readFile,
  writeFile,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  nodeExecPath: process.execPath,
  npmExecPath: process.env.npm_execpath,
  platform: process.platform,
};

export const findAvailablePort = (host = "127.0.0.1") => getPort({ host });

export const isPreviewPortAvailable = async (host: string, port: number) => {
  const availablePort = await detectPort({ hostname: host, port });
  return availablePort === port;
};

const processEnv = () => process.env;

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
  const key = pathKey({ env: extraEnv });
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

export const getPreviewStartArgs = (options: PreviewServerOptions) =>
  options.mode === "iterative"
    ? [
        "run",
        "dev",
        "--",
        "--host",
        options.host,
        "--port",
        String(options.port),
        "--strictPort",
      ]
    : ["run", "start"];

export const getNpmInvocation = (
  args: string[],
  {
    nodeExecPath = process.execPath,
    npmExecPath = process.env.npm_execpath,
    platform = process.platform,
  }: {
    nodeExecPath?: string;
    npmExecPath?: string;
    platform?: typeof process.platform;
  } = {}
) => {
  const npmCliName =
    npmExecPath === undefined
      ? undefined
      : platform === "win32"
        ? win32.basename(npmExecPath)
        : basename(npmExecPath);
  if (npmExecPath !== undefined && npmCliName !== undefined) {
    const npmCliPath =
      npmCliName === "npm-cli.js"
        ? npmExecPath
        : npmCliName === "npx-cli.js"
          ? platform === "win32"
            ? win32.join(win32.dirname(npmExecPath), "npm-cli.js")
            : join(dirname(npmExecPath), "npm-cli.js")
          : undefined;
    if (npmCliPath !== undefined) {
      return { command: nodeExecPath, args: [npmCliPath, ...args] };
    }
  }
  if (platform === "win32") {
    return {
      command: nodeExecPath,
      args: [
        win32.join(
          win32.dirname(nodeExecPath),
          "node_modules",
          "npm",
          "bin",
          "npm-cli.js"
        ),
        ...args,
      ],
    };
  }
  return { command: "npm", args };
};

export const runPreviewBuild = async (
  dependencies = defaultPreviewServerDependencies,
  cwd?: string,
  stdio: StdioOptions = "inherit"
) => {
  const invocation = getNpmInvocation(getPreviewBuildArgs(), dependencies);
  const buildProcess = dependencies.spawn(invocation.command, invocation.args, {
    cwd,
    stdio,
    env: getPreviewEnv(cwd, {
      ...processEnv(),
      CI: "1",
      NODE_ENV: "production",
    }),
  });
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
  options: PreviewServerOptions & {
    stdio?: StdioOptions;
    detached?: boolean;
  },
  dependencies = defaultPreviewServerDependencies
): PreviewServerResult => {
  const invocation = getNpmInvocation(
    getPreviewStartArgs(options),
    dependencies
  );
  const previewProcess = dependencies.spawn(
    invocation.command,
    invocation.args,
    {
      cwd: options.cwd,
      ...(options.detached === undefined ? {} : { detached: options.detached }),
      stdio: options.stdio ?? "inherit",
      env: getPreviewEnv(options.cwd, {
        ...processEnv(),
        HOST: options.host,
        PORT: String(options.port),
        ...(options.imageDomains === undefined
          ? {}
          : { DOMAINS: options.imageDomains.join(",") }),
        NODE_ENV: options.mode === "iterative" ? "development" : "production",
        ...(options.mode === "iterative"
          ? { WEBSTUDIO_PREVIEW_HMR: "disabled" }
          : {}),
      }),
    }
  );
  return {
    url: getPreviewUrl(options),
    process: previewProcess,
  };
};

const killPreviewProcess = async (
  previewProcess: ChildProcess,
  signal: NodeJS.Signals,
  dependencies: PreviewServerDependencies
) => {
  if (dependencies.platform === "win32" && previewProcess.pid !== undefined) {
    return await dependencies.killWindowsProcessTree(previewProcess.pid);
  }
  if (dependencies.platform !== "win32" && previewProcess.pid !== undefined) {
    try {
      return dependencies.killProcess(-previewProcess.pid, signal);
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ESRCH") {
        return false;
      }
      throw error;
    }
  }
  return previewProcess.kill(signal);
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
  url?: string;
  pid?: number;
  running: boolean;
  mode?: PreviewMode;
};

type PreviewControllerStartOptions = Partial<PreviewServerOptions> & {
  restart?: boolean;
  buildCacheKey?: string;
};

export const arePreviewImageDomainsEqual = (
  left: string[] | undefined,
  right: string[] | undefined
) =>
  left === right ||
  (left !== undefined &&
    right !== undefined &&
    left.length === right.length &&
    left.every((value, index) => value === right[index]));

export const previewBuildCacheMarker = ".webstudio-preview-build";

const getPreviewProjectIdentity = async (
  cwd: string | undefined,
  dependencies = defaultPreviewServerDependencies
) => {
  if (cwd === undefined) {
    return undefined;
  }
  try {
    const data = JSON.parse(
      await dependencies.readFile(join(cwd, ".webstudio", "data.json"), "utf8")
    ) as { build?: { projectId?: unknown; version?: unknown } };
    if (typeof data.build?.projectId !== "string") {
      throw new Error("projectId is missing");
    }
    return {
      projectId: data.build.projectId,
      ...(typeof data.build.version === "number"
        ? { version: data.build.version }
        : {}),
    };
  } catch (error) {
    throw new Error(
      `Could not identify the generated preview project in ${join(cwd, ".webstudio", "data.json")}.`,
      { cause: error }
    );
  }
};

const getGeneratedSiteIdentity = (html: string) => {
  const document = parseHtml(html);
  const visit = (
    node: DefaultTreeAdapterMap["node"]
  ): { projectId: string; version?: number } | undefined => {
    if ("attrs" in node && Array.isArray(node.attrs)) {
      const attributes = new Map(
        node.attrs.map(({ name, value }) => [name, value])
      );
      const projectId = attributes.get("data-ws-project");
      const versionValue = attributes.get("data-ws-version");
      if (projectId !== undefined) {
        const version = Number(versionValue);
        return {
          projectId,
          ...(Number.isFinite(version) ? { version } : {}),
        };
      }
    }
    if ("childNodes" in node) {
      for (const child of node.childNodes) {
        const identity = visit(child);
        if (identity !== undefined) {
          return identity;
        }
      }
    }
  };
  return visit(document);
};

export const waitForPreviewReady = async (
  url: string,
  {
    timeoutMs = 30_000,
    intervalMs = 250,
    isRunning,
    requiredAssetNames = [],
    requiredProject,
  }: {
    timeoutMs?: number;
    intervalMs?: number;
    isRunning?: () => boolean;
    requiredAssetNames?: string[];
    requiredProject?: { projectId: string; version?: number };
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
      if (response.status === 401 && requiredProject !== undefined) {
        const identityResponse = await dependencies.fetch(
          new URL("/__webstudio/preview.json", url),
          {
            method: "GET",
            signal: AbortSignal.timeout(attemptTimeoutMs),
          }
        );
        if (identityResponse.ok) {
          const identity = (await identityResponse.json()) as {
            projectId?: unknown;
            version?: unknown;
          };
          if (
            identity.projectId === requiredProject.projectId &&
            (requiredProject.version === undefined ||
              identity.version === requiredProject.version)
          ) {
            return;
          }
          sawUnexpectedProject = true;
        }
      }
      if (response.status < 500) {
        if (requiredAssetNames.length === 0 && requiredProject === undefined) {
          return;
        }
        const html = await response.text();
        const identity = getGeneratedSiteIdentity(html);
        const servesExpectedProject =
          requiredProject === undefined ||
          (identity?.projectId === requiredProject.projectId &&
            (requiredProject.version === undefined ||
              identity.version === requiredProject.version));
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
  dependencies = defaultPreviewServerDependencies,
  { manageProcessSignals = true }: { manageProcessSignals?: boolean } = {}
) => {
  let server: PreviewServerResult | undefined;
  let currentOptions = defaults;
  let currentCwd = defaults.cwd;
  let serverOutput = "";
  const terminationSignals = ["SIGHUP", "SIGINT", "SIGTERM"] as const;
  let isTerminating = false;
  const terminationHandlers = new Map<NodeJS.Signals, () => void>();
  const removeTerminationHandlers = () => {
    for (const [signal, handler] of terminationHandlers) {
      dependencies.parentProcess.off(signal, handler);
    }
    terminationHandlers.clear();
  };
  const installTerminationHandlers = () => {
    if (manageProcessSignals === false || terminationHandlers.size > 0) {
      return;
    }
    for (const signal of terminationSignals) {
      const handler = () => {
        if (isTerminating) {
          return;
        }
        isTerminating = true;
        const activeServer = server;
        server = undefined;
        removeTerminationHandlers();
        if (activeServer === undefined) {
          dependencies.parentProcess.kill(
            dependencies.parentProcess.pid,
            signal
          );
          return;
        }
        void killPreviewProcess(activeServer.process, "SIGTERM", dependencies)
          .catch(() => undefined)
          .finally(() => {
            dependencies.parentProcess.kill(
              dependencies.parentProcess.pid,
              signal
            );
          });
      };
      terminationHandlers.set(signal, handler);
      dependencies.parentProcess.once(signal, handler);
    }
  };
  const appendServerOutput = (chunk: unknown) => {
    serverOutput = `${serverOutput}${String(chunk)}`.slice(-4000);
  };
  const isRunning = () =>
    server !== undefined &&
    server.process.killed === false &&
    server.process.exitCode === null &&
    server.process.signalCode === null;
  const getStatus = (): PreviewControllerResult => {
    if (isRunning() === false) {
      return { running: false };
    }
    return {
      url: getPreviewUrl(currentOptions),
      pid: server?.process.pid,
      running: true,
      mode: currentOptions.mode ?? "production",
    };
  };
  const resolveOptions = (
    options: PreviewControllerStartOptions
  ): PreviewServerOptions => {
    const running = isRunning();
    return {
      host: options.host ?? (running ? currentOptions.host : defaults.host),
      port: options.port ?? (running ? currentOptions.port : defaults.port),
      cwd: options.cwd ?? (running ? currentCwd : defaults.cwd),
      imageDomains:
        options.imageDomains ??
        (running ? currentOptions.imageDomains : defaults.imageDomains),
      mode:
        options.mode ??
        (running ? currentOptions.mode : defaults.mode) ??
        "production",
    };
  };
  const canReuse = (options: PreviewControllerStartOptions = {}) => {
    if (isRunning() === false) {
      return false;
    }
    const nextOptions = resolveOptions(options);
    return (
      nextOptions.host === currentOptions.host &&
      nextOptions.port === currentOptions.port &&
      nextOptions.cwd === currentCwd &&
      nextOptions.mode === (currentOptions.mode ?? "production") &&
      arePreviewImageDomainsEqual(
        nextOptions.imageDomains,
        currentOptions.imageDomains
      )
    );
  };
  const stop = async () => {
    if (server === undefined) {
      return;
    }
    const process = server.process;
    server = undefined;
    removeTerminationHandlers();
    if (
      process.killed ||
      process.exitCode !== null ||
      process.signalCode !== null
    ) {
      return;
    }
    const exited = new Promise<void>((resolve, reject) => {
      process.once("error", reject);
      process.once("exit", () => resolve());
    });
    if (
      (await killPreviewProcess(process, "SIGTERM", dependencies)) === false
    ) {
      return;
    }
    await exited;
  };
  const start = async (
    options: PreviewControllerStartOptions = {}
  ): Promise<PreviewControllerResult> => {
    const running = isRunning();
    const nextOptions = resolveOptions(options);
    if (running) {
      if (options.restart !== true) {
        if (canReuse(options) === false) {
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
      nextOptions.mode === "production" &&
      (options.buildCacheKey === undefined ||
        cachedBuildKey !== options.buildCacheKey)
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
    const startedServer = startPreviewServer(
      {
        ...nextOptions,
        detached: dependencies.platform !== "win32",
        stdio: ["ignore", "pipe", "pipe"],
      },
      dependencies
    );
    server = startedServer;
    installTerminationHandlers();
    startedServer.process.stdout?.on("data", appendServerOutput);
    startedServer.process.stderr?.on("data", appendServerOutput);
    startedServer.process.once("exit", () => {
      if (server === startedServer) {
        server = undefined;
        removeTerminationHandlers();
      }
    });
    return getStatus();
  };
  return {
    canReuse,
    start,
    async startAndWait(
      options: PreviewControllerStartOptions = {}
    ): Promise<PreviewControllerResult> {
      const nextCwd = options.cwd ?? (isRunning() ? currentCwd : defaults.cwd);
      const requiredProject = await getPreviewProjectIdentity(
        nextCwd,
        dependencies
      );
      const result = await start(options);
      const url = result.url ?? getPreviewUrl(currentOptions);
      const requiredAssetNames =
        result.mode === "production"
          ? await getPreviewCssAssetNames(currentCwd, dependencies)
          : [];
      try {
        await waitForPreviewReady(
          url,
          { isRunning, requiredAssetNames, requiredProject },
          dependencies
        );
      } catch (error) {
        const output = serverOutput.trim();
        if (output !== "" && error instanceof Error) {
          throw new Error(
            formatPreviewServerStartupError({
              message: error.message,
              output,
              url,
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
