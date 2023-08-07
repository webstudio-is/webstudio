import { join } from "node:path";
import { cwd } from "node:process";
import envPaths from "env-paths";

const GLOBAL_APP_CONFIG = envPaths("webstudio").config;
const GLOBAL_CONFIG_FILE_NAME = "webstudio-config.json";
export const GLOBAL_CONFIG_FILE = join(
  GLOBAL_APP_CONFIG,
  GLOBAL_CONFIG_FILE_NAME
);

export const LOCAL_APP_NAME = "webstudio-project";
export const LOCAL_APP_CONFIG_FILE_NAME = "build.json";
export const LOCAL_CONFIG_FILE = join(
  cwd(),
  LOCAL_APP_NAME,
  LOCAL_APP_CONFIG_FILE_NAME
);

export interface GlobalConfig {
  [projectId: string]: {
    host: string;
    token: string;
  };
}
