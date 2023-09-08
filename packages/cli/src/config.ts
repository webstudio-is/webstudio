import { join } from "node:path";
import envPaths from "env-paths";

const GLOBAL_CONFIG_FOLDER = envPaths("webstudio").config;
const GLOBAL_CONFIG_FILE_NAME = "webstudio-config.json";
export const GLOBAL_CONFIG_FILE = join(
  GLOBAL_CONFIG_FOLDER,
  GLOBAL_CONFIG_FILE_NAME
);

export const LOCAL_CONFIG_FILE = ".webstudio/config.json";
export const LOCAL_DATA_FILE = ".webstudio/data.json";

// @todo remove
export const ASSETS_BASE = "/assets/";

export type LocalConfig = {
  projectId: string;
};

export type GlobalConfig = {
  [projectId: string]: {
    host: string;
    token: string;
  };
};
