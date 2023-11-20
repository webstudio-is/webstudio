import { stdin, stdout, cwd } from "node:process";
import { join } from "node:path";
import * as readline from "node:readline/promises";
import { readFile, writeFile } from "node:fs/promises";
import {
  GLOBAL_CONFIG_FILE,
  LOCAL_CONFIG_FILE,
  type GlobalConfig,
  jsonToGlobalConfig,
  type LocalConfig,
} from "../config";
import { ensureFileInPath } from "../fs-utils";
import type {
  CommonYargsArgv,
  StrictYargsOptionsToInterface,
} from "./yargs-types";

export const linkOptions = (yargs: CommonYargsArgv) =>
  yargs.option("link", {
    alias: "l",
    type: "string",
    describe: "Link to a webstudio project",
  });

export const link = async (
  options: StrictYargsOptionsToInterface<typeof linkOptions> | { link?: string }
) => {
  let shareLink: string;
  if (options.link) {
    shareLink = options.link;
  } else {
    const rl = readline.createInterface({ input: stdin, output: stdout });
    shareLink = await rl.question(
      `Please paste a link from the Share Dialog in the builder: `
    );
    rl.close();
  }

  const shareLinkUrl = new URL(shareLink);
  const origin = shareLinkUrl.origin;
  const token = shareLinkUrl.searchParams.get("authToken");
  const paths = shareLinkUrl.pathname.split("/").slice(1);

  if (paths[0] !== "builder" || paths.length !== 2) {
    throw new Error("Invalid share link.");
  }

  const projectId = paths[1];

  if (token == null) {
    throw new Error("Invalid share link.");
  }

  try {
    const currentConfig = await readFile(GLOBAL_CONFIG_FILE, "utf-8");
    const currentConfigJson = jsonToGlobalConfig(JSON.parse(currentConfig));

    const newConfig: GlobalConfig = {
      ...currentConfigJson,
      [projectId]: {
        origin,
        token,
      },
    };

    await writeFile(GLOBAL_CONFIG_FILE, JSON.stringify(newConfig, null, 2));
    console.info(`Saved credentials for project ${projectId}.
  You can find your config at ${GLOBAL_CONFIG_FILE}
        `);

    const localConfig: LocalConfig = {
      projectId,
    };

    await ensureFileInPath(
      join(cwd(), LOCAL_CONFIG_FILE),
      JSON.stringify(localConfig, null, 2)
    );
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENONET") {
      throw new Error(`Global config file is not found`);
    }

    throw error;
  }
};
