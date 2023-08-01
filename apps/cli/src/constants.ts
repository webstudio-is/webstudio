import { join } from "node:path";
import envPaths from "env-paths";

const APP_CONFIG = envPaths("webstudio").config;
const GLOBAL_CONFIG_FILE_NAME = "webstudio-config.json";
export const GLOBAL_CONFIG_FILE = join(APP_CONFIG, GLOBAL_CONFIG_FILE_NAME);
