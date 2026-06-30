import { readFile } from "node:fs/promises";
import { cwd } from "node:process";
import { join } from "node:path";
import {
  GLOBAL_CONFIG_FILE,
  LOCAL_CONFIG_FILE,
  jsonToGlobalConfig,
  jsonToLocalConfig,
} from "./config";
import { isFileExists } from "./fs-utils";

export type ApiConnection = {
  origin: string;
  authToken: string;
  projectId: string;
  headers?: Record<string, string | undefined>;
};

export type ApiConnectionDependencies = {
  isFileExists: typeof isFileExists;
  readFile: (path: string, encoding: "utf-8") => Promise<string>;
};

export const defaultApiConnectionDependencies: ApiConnectionDependencies = {
  isFileExists,
  readFile,
};

export const resolveApiConnection = async (
  dependencies = defaultApiConnectionDependencies
): Promise<ApiConnection> => {
  if ((await dependencies.isFileExists(LOCAL_CONFIG_FILE)) === false) {
    throw new Error(
      "Local config file is not found. Run webstudio init --link <api-share-link> from a Webstudio project."
    );
  }

  const localConfig = jsonToLocalConfig(
    JSON.parse(
      await dependencies.readFile(join(cwd(), LOCAL_CONFIG_FILE), "utf-8")
    )
  );
  const globalConfig = jsonToGlobalConfig(
    JSON.parse(await dependencies.readFile(GLOBAL_CONFIG_FILE, "utf-8"))
  );
  const projectConfig = globalConfig[localConfig.projectId];
  if (projectConfig === undefined) {
    throw new Error(
      "Project config is not found. Run webstudio init --link <api-share-link>."
    );
  }

  return {
    origin: projectConfig.origin,
    authToken: projectConfig.token,
    projectId: localConfig.projectId,
  };
};
