import {
  spawn,
  type ChildProcess,
  type StdioOptions,
} from "node:child_process";

export type PreviewServerOptions = {
  host: string;
  port: number;
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

export const getPreviewUrl = ({
  host,
  port,
  path = "/",
}: PreviewServerOptions & { path?: string }) =>
  new URL(path, `http://${host}:${port}`).toString();

export const getPreviewDevArgs = ({ host, port }: PreviewServerOptions) => [
  "run",
  "dev",
  "--",
  "--host",
  host,
  "--port",
  String(port),
];

export const startPreviewDevServer = (
  options: PreviewServerOptions & { stdio?: StdioOptions },
  dependencies = defaultPreviewServerDependencies
): PreviewServerResult => {
  const process = dependencies.spawn("npm", getPreviewDevArgs(options), {
    stdio: options.stdio ?? "inherit",
  });
  return {
    url: getPreviewUrl(options),
    process,
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
  const start = (
    options: Partial<PreviewServerOptions> = {}
  ): PreviewControllerResult => {
    const running = isRunning();
    const nextOptions = {
      host: options.host ?? (running ? currentOptions.host : defaults.host),
      port: options.port ?? (running ? currentOptions.port : defaults.port),
    };
    if (running) {
      if (
        nextOptions.host !== currentOptions.host ||
        nextOptions.port !== currentOptions.port
      ) {
        throw new Error(
          `Preview server is already running at ${getPreviewUrl(currentOptions)}. Stop it before starting a different preview server.`
        );
      }
      return getStatus();
    }
    currentOptions = nextOptions;
    server = startPreviewDevServer(
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
      options: Partial<PreviewServerOptions> = {}
    ): Promise<PreviewControllerResult> {
      const result = start(options);
      await waitForPreviewReady(result.url, { isRunning }, dependencies);
      return result;
    },
    status: getStatus,
    resolveUrl(path = "/") {
      return getPreviewUrl({ ...currentOptions, path });
    },
  };
};
