import { readFile, writeFile } from "node:fs/promises";
import { cwd } from "node:process";
import { join } from "node:path";
import ora from "ora";
import { loadProjectDataById } from "@webstudio-is/http-client";
import pc from "picocolors";

import { ensureFileInPath, isFileExists } from "../fs-utils";
import {
  GLOBAL_CONFIG_FILE,
  LOCAL_CONFIG_FILE,
  LOCAL_DATA_FILE,
  jsonToGlobalConfig,
  jsonToLocalConfig,
} from "../config";
import type {
  CommonYargsArgv,
  StrictYargsOptionsToInterface,
} from "./yargs-types";

export const syncOptions = (yargs: CommonYargsArgv) =>
  yargs
    .option("buildId", {
      type: "string",
      describe: "[Experimental] Project build id to sync",
    })
    .option("host", { type: "string", describe: "Host to sync with" });

export const sync = async (
  options: StrictYargsOptionsToInterface<typeof syncOptions>
) => {
  const spinner = ora("Syncing project data").start();

  spinner.text = "Loading project data from config file";

  if ((await isFileExists(GLOBAL_CONFIG_FILE)) === false) {
    spinner.fail(
      `Global config file at path ${GLOBAL_CONFIG_FILE} is not found. Please link your project using webstudio link command`
    );
    return;
  }

  const globalConfigText = await readFile(GLOBAL_CONFIG_FILE, "utf-8");
  const globalConfig = jsonToGlobalConfig(JSON.parse(globalConfigText));

  if ((await isFileExists(LOCAL_CONFIG_FILE)) === false) {
    spinner.fail(
      `Local config file is not found. Please make sure current directory is a webstudio project`
    );
    return;
  }

  const localConfigText = await readFile(
    join(cwd(), LOCAL_CONFIG_FILE),
    "utf-8"
  );

  const localConfig = jsonToLocalConfig(JSON.parse(localConfigText));

  const projectConfig = globalConfig[localConfig.projectId];

  if (projectConfig === undefined) {
    spinner.fail(
      `Project config is not found, please run ${pc.dim("webstudio-cli link")}`
    );
    return;
  }

  const { origin, token } = projectConfig;

  spinner.text = "Loading project data from webstudio\n";

  const project = await loadProjectDataById({
    projectId: localConfig.projectId,
    authToken: token,
    origin,
  });

  spinner.text = "Saving project data to config file";

  const localBuildFilePath = join(cwd(), LOCAL_DATA_FILE);
  await ensureFileInPath(localBuildFilePath);
  await writeFile(localBuildFilePath, JSON.stringify(project, null, 2), "utf8");

  spinner.succeed("Project data synced successfully");
};
