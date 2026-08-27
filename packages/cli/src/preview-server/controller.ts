import { join } from "node:path";
import { previewBuildCacheMarker } from "./constants";
import { defaultPreviewServerDependencies } from "./dependencies";
import {
  getPreviewCssAssetNames,
  getPreviewProjectIdentity,
  waitForPreviewReady,
} from "./readiness";
import {
  getPreviewUrl,
  runPreviewBuild,
  startPreviewServer,
  stopPreviewProcess,
} from "./server";
import type {
  PreviewMode,
  PreviewServerOptions,
  PreviewServerResult,
} from "./types";

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
        try {
          stopPreviewProcess(activeServer.process);
        } finally {
          dependencies.parentProcess.kill(
            dependencies.parentProcess.pid,
            signal
          );
        }
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
    if (stopPreviewProcess(process) === false) {
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
