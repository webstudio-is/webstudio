import { join } from "node:path";
import envPaths from "env-paths";

const APP_CONFIG = envPaths("webstudio").config;
const GLOBAL_CONFIG_FILE_NAME = "webstudio-config.json";
export const GLOBAL_CONFIG_FILE = join(APP_CONFIG, GLOBAL_CONFIG_FILE_NAME);

export const CLI_ARGS_OPTIONS = {
  version: {
    type: "boolean" as const,
    short: "v",
  },
  help: {
    type: "boolean" as const,
    short: "h",
  },
};

export const HELP = `Usage:
    $ webstudio commands [flags...]
  Commands:
    link <shared link>              Login to Webstudio with shared link

    Flags:
    --debug                         Enable debug mode
    --help, -h                      Show this help message
    --version, -v                   Show the version of this script
`;
