import { join } from "node:path";
import envPaths from "env-paths";
const GLOBAL_CONFIG_FOLDER = envPaths("webstudio").config;
const GLOBAL_CONFIG_FILE_NAME = "webstudio-config.json";
const GLOBAL_CONFIG_FILE = join(GLOBAL_CONFIG_FOLDER, GLOBAL_CONFIG_FILE_NAME);
const LOCAL_CONFIG_FILE = ".webstudio/config.json";
const LOCAL_DATA_FILE = ".webstudio/data.json";
const ASSETS_BASE = "/assets/";
export { ASSETS_BASE, GLOBAL_CONFIG_FILE, LOCAL_CONFIG_FILE, LOCAL_DATA_FILE };
