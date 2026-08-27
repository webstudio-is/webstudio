import { readFileSync, realpathSync } from "node:fs";
import { posix, win32 } from "node:path";
import { defaultPreviewServerDependencies } from "./dependencies";

type PreviewPackageManagerOptions = {
  nodeExecPath?: string;
  npmExecPath?: string;
  platform?: typeof process.platform;
  readPackageFile?: (path: string) => string;
  resolveLauncherPath?: (path: string) => string;
};

type PreviewPackageManager = {
  name: "npm" | "pnpm";
  command: string;
  argsPrefix: string[];
};

const findLauncherPackage = (
  executablePath: string,
  platform: typeof process.platform,
  readPackageFile: (path: string) => string,
  resolveLauncherPath: (path: string) => string
) => {
  const pathApi = platform === "win32" ? win32 : posix;
  const resolvedExecutablePath = resolveLauncherPath(executablePath);
  const normalizePath = (path: string) =>
    platform === "win32" ? path.toLowerCase() : path;
  let directory = pathApi.dirname(resolvedExecutablePath);
  while (true) {
    const packagePath = pathApi.join(directory, "package.json");
    try {
      const value: unknown = JSON.parse(readPackageFile(packagePath));
      if (typeof value === "object" && value !== null) {
        const packageValue = value as {
          name?: unknown;
          bin?: unknown;
        };
        const name =
          typeof packageValue.name === "string" ? packageValue.name : undefined;
        const binEntries =
          typeof packageValue.bin === "string" && name !== undefined
            ? [[name.split("/").at(-1) ?? name, packageValue.bin] as const]
            : typeof packageValue.bin === "object" && packageValue.bin !== null
              ? Object.entries(packageValue.bin).filter(
                  (entry): entry is [string, string] =>
                    typeof entry[1] === "string"
                )
              : [];
        const matchedBin = binEntries.find(([, binPath]) => {
          const resolvedBinPath = pathApi.resolve(directory, binPath);
          return (
            normalizePath(resolvedBinPath) ===
            normalizePath(resolvedExecutablePath)
          );
        });
        if (matchedBin !== undefined) {
          return {
            directory,
            value: { name, bin: Object.fromEntries(binEntries) },
            commandName: matchedBin[0],
          };
        }
      }
    } catch (error) {
      if (
        typeof error !== "object" ||
        error === null ||
        !("code" in error) ||
        (error.code !== "ENOENT" && error.code !== "ENOTDIR")
      ) {
        throw new Error(
          `PREVIEW_PACKAGE_MANAGER_INVALID: Could not read package-manager metadata at ${packagePath}.`,
          { cause: error }
        );
      }
    }
    const parentDirectory = pathApi.dirname(directory);
    if (parentDirectory === directory) {
      return;
    }
    directory = parentDirectory;
  }
};

const resolveLauncherPackage = (
  executablePath: string,
  platform: typeof process.platform,
  readPackageFile: (path: string) => string,
  resolveLauncherPath: (path: string) => string
): {
  directory: string;
  value: { name?: string; bin: Record<string, string> };
  commandName: string;
  name: PreviewPackageManager["name"];
} => {
  const packageInfo = findLauncherPackage(
    executablePath,
    platform,
    readPackageFile,
    resolveLauncherPath
  );
  const packageName = packageInfo?.value.name;
  const commandName = packageInfo?.commandName;
  const name =
    commandName === "npm" || commandName === "npx"
      ? "npm"
      : commandName === "pnpm" || commandName === "pnpx"
        ? "pnpm"
        : packageName === "npm" || packageName === "pnpm"
          ? packageName
          : undefined;
  if (packageInfo !== undefined && name !== undefined) {
    return {
      directory: packageInfo.directory,
      value: packageInfo.value,
      commandName: packageInfo.commandName,
      name,
    };
  }
  if (packageInfo !== undefined) {
    throw new Error(
      `PREVIEW_PACKAGE_MANAGER_UNSUPPORTED: Preview supports npm and pnpm, but ${executablePath} is the ${commandName} command from ${packageName ?? "an unidentified package"}.`
    );
  }
  throw new Error(
    `PREVIEW_PACKAGE_MANAGER_UNKNOWN: Could not find package-manager metadata for launcher ${executablePath}.`
  );
};

export const resolvePreviewPackageManager = (
  options: PreviewPackageManagerOptions = defaultPreviewServerDependencies
): PreviewPackageManager => {
  const nodeExecPath = options.nodeExecPath ?? process.execPath;
  const npmExecPath = options.npmExecPath;
  const platform = options.platform ?? process.platform;
  if (npmExecPath !== undefined) {
    const pathApi = platform === "win32" ? win32 : posix;
    const packageInfo = resolveLauncherPackage(
      npmExecPath,
      platform,
      options.readPackageFile ?? ((path) => readFileSync(path, "utf8")),
      options.resolveLauncherPath ?? realpathSync
    );
    let launcherPath = npmExecPath;
    const packageBin = packageInfo.value.bin;
    if (
      packageInfo.commandName !== packageInfo.name &&
      packageBin[packageInfo.name] !== undefined
    ) {
      launcherPath = pathApi.resolve(
        packageInfo.directory,
        packageBin[packageInfo.name]
      );
    }
    if (
      [".js", ".cjs", ".mjs"].includes(
        pathApi.parse(launcherPath).ext.toLowerCase()
      )
    ) {
      return {
        name: packageInfo.name,
        command: nodeExecPath,
        argsPrefix: [launcherPath],
      };
    }
    return { name: packageInfo.name, command: launcherPath, argsPrefix: [] };
  }
  if (platform === "win32") {
    return {
      name: "npm",
      command: nodeExecPath,
      argsPrefix: [
        win32.join(
          win32.dirname(nodeExecPath),
          "node_modules",
          "npm",
          "bin",
          "npm-cli.js"
        ),
      ],
    };
  }
  return { name: "npm", command: "npm", argsPrefix: [] };
};

export const getPackageManagerInvocation = (
  args: string[],
  options: PreviewPackageManagerOptions = defaultPreviewServerDependencies
) => {
  const packageManager = resolvePreviewPackageManager(options);
  return {
    command: packageManager.command,
    args: [...packageManager.argsPrefix, ...args],
  };
};
