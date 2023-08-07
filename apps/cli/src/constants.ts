import { join } from "node:path";
import envPaths from "env-paths";

const GLOBAL_APP_CONFIG = envPaths("webstudio").config;
const GLOBAL_CONFIG_FILE_NAME = "webstudio-config.json";
export const GLOBAL_CONFIG_FILE = join(
  GLOBAL_APP_CONFIG,
  GLOBAL_CONFIG_FILE_NAME
);

export const PROJECT_NAME = "webstudio-project";
export const LOCAL_CONFIG_FILE_NAME = ".webstudio/config.json";
export const LOCAL_BUILD_FILE_NAME = ".webstudio/data.json";

export type LocalConfig = {
  projectId: string;
};

export type GlobalConfig = {
  [projectId: string]: {
    host: string;
    token: string;
  };
};
