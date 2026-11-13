import { delimiter, dirname, join, parse, win32 } from "node:path";
import pathKey from "path-key";

export const processEnv = () => process.env;

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

export const getPreviewEnv = ({
  cwd,
  extraEnv,
  nodeExecPath,
  platform,
}: {
  cwd?: string;
  extraEnv: NodeJS.ProcessEnv;
  nodeExecPath: string;
  platform: NodeJS.Platform;
}) => {
  const key = pathKey({ env: extraEnv, platform });
  const separator = platform === "win32" ? win32.delimiter : delimiter;
  const nodeBinDirectory =
    platform === "win32" ? win32.dirname(nodeExecPath) : dirname(nodeExecPath);
  return {
    ...extraEnv,
    [key]: [
      nodeBinDirectory,
      ...(cwd === undefined ? [] : getAncestorBinPaths(cwd)),
      extraEnv[key],
    ]
      .filter(Boolean)
      .join(separator),
  };
};

export const getNodeRuntimeEnv = (
  nodeExecPath: string,
  env: NodeJS.ProcessEnv,
  platform: NodeJS.Platform
) => getPreviewEnv({ extraEnv: env, nodeExecPath, platform });
