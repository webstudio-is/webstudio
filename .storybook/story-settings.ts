import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

export const hasPrivateStorySources = (repositoryRoot: string) => {
  const directory = path.join(
    repositoryRoot,
    "packages/sdk-components-animation/private-src"
  );
  return existsSync(directory) && readdirSync(directory).length > 0;
};
