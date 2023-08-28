import { parseArgs } from "node:util";
import stripIndent from "strip-indent";
const showHelp = () =>
  console.info(
    stripIndent(`
      Usage:
      $ webstudio commands [flags...]

      Commands:
      link       Link to an existing webstudio project
      sync       Sync the linked webstudio project with the latest build
      build      Build the linked webstudio project with a remix template.

     Flags:
     --help     -h     Show this help message
    --version  -v     Show the version of this script
`)
  );
const CLI_ARGS_OPTIONS = {
  version: {
    type: "boolean",
    short: "v",
  },
  help: {
    type: "boolean",
    short: "h",
  },
  type: {
    type: "string",
    short: "t",
    default: "defaults",
  },
};
const SupportedProjects = {
  defaults: true,
};
export { CLI_ARGS_OPTIONS, SupportedProjects, showHelp };
