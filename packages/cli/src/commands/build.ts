import { access } from "node:fs/promises";
import { prebuild } from "../prebuild";
import { LOCAL_DATA_FILE } from "../config";
import type {
  CommonYargsArgv,
  StrictYargsOptionsToInterface,
} from "./yargs-types";

export const buildOptions = (yargs: CommonYargsArgv) =>
  yargs.option("assets", {
    type: "boolean",
    default: true,
    describe: "Download assets",
  });

// @todo: use options.assets to define if we need to download assets
export const build = async (
  options:
    | StrictYargsOptionsToInterface<typeof buildOptions>
    | { assets?: boolean }
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

  await prebuild();
};
