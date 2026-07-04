import {
  spawn,
  type ChildProcess,
  type StdioOptions,
} from "node:child_process";
import { delimiter, dirname, join, parse } from "node:path";

export type PreviewServerOptions = {
  host: string;
  port: number;
  cwd?: string;
};

export type PreviewServerResult = {
  url: string;
  process: ChildProcess;
};

export type PreviewServerDependencies = {
  spawn: typeof spawn;
  fetch: typeof fetch;
  sleep: (ms: number) => Promise<void>;
};

export const defaultPreviewServerDependencies: PreviewServerDependencies = {
  spawn,
  fetch,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
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

export const getPreviewStartArgs = ({ host, port }: PreviewServerOptions) => [
  "run",
  "start",
  "--",
  "--host",
  host,
  "--port",
  String(port),
  "--strictPort",
];

export const getPreviewCommand = (
  platform: typeof process.platform = process.platform
) => (platform === "win32" ? "npm.cmd" : "npm");

export const runPreviewBuild = async (
  dependencies = defaultPreviewServerDependencies,
  cwd?: string
) => {
  const buildProcess = dependencies.spawn(
    getPreviewCommand(),
    getPreviewBuildArgs(),
    {
      cwd,
      stdio: "inherit",
      env: getPreviewEnv(cwd, {
        ...processEnv(),
        NODE_ENV: "production",
      }),
    }
  );
  await waitForPreviewExit(buildProcess);
};

export const startPreviewServer = (
  options: PreviewServerOptions & { stdio?: StdioOptions },
  dependencies = defaultPreviewServerDependencies
): PreviewServerResult => {
  const previewProcess = dependencies.spawn(
    getPreviewCommand(),
    getPreviewStartArgs(options),
    {
      cwd: options.cwd,
      stdio: options.stdio ?? "inherit",
      env: getPreviewEnv(options.cwd, {
        ...processEnv(),
        HOST: options.host,
        PORT: String(options.port),
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
};

export const waitForPreviewReady = async (
  url: string,
  {
    timeoutMs = 30_000,
    intervalMs = 250,
    isRunning,
  }: {
    timeoutMs?: number;
    intervalMs?: number;
    isRunning?: () => boolean;
  } = {},
  dependencies = defaultPreviewServerDependencies
) => {
  const deadline = Date.now() + timeoutMs;
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
        return;
      }
    } catch {
      // Server is still starting.
    }
    await dependencies.sleep(intervalMs);
  }
  throw new Error(`Preview server did not become ready at ${url}.`);
};

export const createPreviewController = (
  defaults: PreviewServerOptions,
  dependencies = defaultPreviewServerDependencies
) => {
  let server: PreviewServerResult | undefined;
  let currentOptions = defaults;
  let currentCwd = defaults.cwd;
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
    };
    if (running) {
      if (options.restart !== true) {
        if (
          nextOptions.host !== currentOptions.host ||
          nextOptions.port !== currentOptions.port ||
          nextOptions.cwd !== currentCwd
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
    await runPreviewBuild(dependencies, currentCwd);
    server = startPreviewServer(
      {
        ...nextOptions,
        stdio: ["ignore", "ignore", "ignore"],
      },
      dependencies
    );
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
      const result = await start(options);
      await waitForPreviewReady(result.url, { isRunning }, dependencies);
      return result;
    },
    status: getStatus,
    resolveUrl(path = "/") {
      return getPreviewUrl({ ...currentOptions, path });
    },
  };
};
