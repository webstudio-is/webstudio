import { access } from "node:fs/promises";
import { exit } from "node:process";
import { log } from "@clack/prompts";
import { prebuild } from "../prebuild";
import { LOCAL_DATA_FILE, PROJECT_TEMPLATES } from "../config";
import type {
  CommonYargsArgv,
  StrictYargsOptionsToInterface,
} from "./yargs-types";
import { mapToTemplatesFromOptions } from "../build-utils";

export const buildOptions = (yargs: CommonYargsArgv) =>
  yargs
    .option("assets", {
      type: "boolean",
      default: true,
      describe: "[Experimental] Download assets",
    })
    .option("template", {
      type: "array",
      string: true,
      default: [] as string[],

      coerce: mapToTemplatesFromOptions,

      describe: `Template to use for the build [choices: ${PROJECT_TEMPLATES.map(
        (item) => item.value
      ).join(", ")}]`,
    });

// @todo: use options.assets to define if we need to download assets
export const build = async (
  options: StrictYargsOptionsToInterface<typeof buildOptions>
) => {
  try {
    await access(LOCAL_DATA_FILE);
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      log.error(
        `You need to link a webstudio project before building it. Run \`webstudio link\` to link a project.`
      );
      exit(1);
    }

    throw error;
  }

  await prebuild(options);
};
