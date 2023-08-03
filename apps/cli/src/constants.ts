import { join } from "node:path";
import envPaths from "env-paths";

const GLOBA_APP_CONFIG = envPaths("webstudio").config;
const GLOBAL_CONFIG_FILE_NAME = "webstudio-config.json";
export const GLOBAL_CONFIG_FILE = join(
  GLOBA_APP_CONFIG,
  GLOBAL_CONFIG_FILE_NAME
);

export const LOCAL_APP_NAME = "webstudio-project";
export const LOCAL_APP_CONFIG_FILE_NAME = "webstudio.json";
export const LOCAL_CONFIG_FILE = join(
  process.cwd(),
  LOCAL_APP_NAME,
  LOCAL_APP_CONFIG_FILE_NAME
);

export interface GlobalConfig {
  [projectId: string]: {
    host: string;
    token: string;
  };
}
