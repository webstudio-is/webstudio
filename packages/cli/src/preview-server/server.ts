import type { ChildProcess, StdioOptions } from "node:child_process";
import { dirname, join } from "node:path";
import detectPort from "detect-port";
import getPort from "get-port";
import { previewProcessOwnerFile } from "./constants";
import { defaultPreviewServerDependencies } from "./dependencies";
import { getPreviewEnv, processEnv } from "./environment";
import { getPackageManagerInvocation } from "./package-manager";
import type { PreviewServerOptions, PreviewServerResult } from "./types";

export const findAvailablePort = (host = "127.0.0.1") => getPort({ host });

export const isPreviewPortAvailable = async (host: string, port: number) => {
  const availablePort = await detectPort({ hostname: host, port });
  return availablePort === port;
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

export const runPreviewBuild = async (
  dependencies = defaultPreviewServerDependencies,
  cwd?: string,
  stdio: StdioOptions = "inherit"
) => {
  const invocation = getPackageManagerInvocation(
    getPreviewBuildArgs(),
    dependencies
  );
  const buildProcess = dependencies.spawn(invocation.command, invocation.args, {
    cwd,
    stdio,
    env: getPreviewEnv({
      cwd,
      extraEnv: {
        ...processEnv(),
        CI: "1",
        NODE_ENV: "production",
      },
      nodeExecPath: dependencies.nodeExecPath,
      platform: dependencies.platform,
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
  const invocation = getPackageManagerInvocation(
    getPreviewStartArgs(options),
    dependencies
  );
  const stdio = options.stdio ?? "inherit";
  const supervisorStdio: StdioOptions = Array.isArray(stdio)
    ? [...stdio.slice(0, 3), "ipc"]
    : [stdio, stdio, stdio, "ipc"];
  const supervisorExecArgv = dependencies.supervisorPath.endsWith(".ts")
    ? dependencies.processExecArgv.filter(
        (argument) =>
          argument.startsWith("--conditions=") ||
          argument.startsWith("--import=")
      )
    : [];
  const previewProcess = dependencies.spawn(
    dependencies.nodeExecPath,
    [
      ...supervisorExecArgv,
      dependencies.supervisorPath,
      JSON.stringify({
        command: invocation.command,
        args: invocation.args,
        cwd: options.cwd,
        ...(options.cwd === undefined
          ? {}
          : {
              ownerFile: join(dirname(options.cwd), previewProcessOwnerFile),
            }),
      }),
    ],
    {
      cwd: options.cwd,
      ...(options.detached === undefined ? {} : { detached: options.detached }),
      stdio: supervisorStdio,
      env: getPreviewEnv({
        cwd: options.cwd,
        extraEnv: {
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
        },
        nodeExecPath: dependencies.nodeExecPath,
        platform: dependencies.platform,
      }),
    }
  );
  return {
    url: getPreviewUrl(options),
    process: previewProcess,
  };
};

export const stopPreviewProcess = (previewProcess: ChildProcess) => {
  if (previewProcess.connected) {
    previewProcess.disconnect();
    return true;
  }
  return previewProcess.kill("SIGTERM");
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
