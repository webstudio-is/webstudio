import { access } from "node:fs/promises";
import { prebuild } from "../prebuild";
import { LOCAL_DATA_FILE, PROJECT_TEMPALTES } from "../config";
import type {
  CommonYargsArgv,
  StrictYargsOptionsToInterface,
} from "./yargs-types";

export const buildOptions = (yargs: CommonYargsArgv) =>
  yargs
    .option("assets", {
      type: "boolean",
      default: true,
      describe: "[Experimental] Download assets",
    })
    .option("preview", {
      type: "boolean",
      default: false,
      describe: "[Experimental] Use preview version of the project",
    })
    .option("template", {
      type: "string",
      default: "vercel",
      describe: `[Experimental] Template to use for the build [choices: ${PROJECT_TEMPALTES.toString()}]`,
    });

// @todo: use options.assets to define if we need to download assets
export const build = async (
  options: StrictYargsOptionsToInterface<typeof buildOptions>
) => {
  try {
    await access(LOCAL_DATA_FILE);
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw new Error(
        `You need to link a webstudio project before building it. Run \`webstudio link\` to link a project.`
      );
    }

    throw error;
  }

  await prebuild(options);
};
