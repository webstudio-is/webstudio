import type { Data } from "@webstudio-is/react-sdk";
import { readFile, writeFile } from "node:fs/promises";
import { cwd } from "node:process";
import { join } from "node:path";
import ora from "ora";
import { loadProjectDataById } from "@webstudio-is/http-client";

import type { Command } from "../args";
import { ensureFileInPath, loadGlobalConfigFile } from "../fs-utils";
import { LOCAL_APP_CONFIG_FILE_NAME, LOCAL_CONFIG_FILE } from "../constants";

export const sync: Command = async (args) => {
  const spinner = ora("Syncing project data").start();
  let projectId = args.positionals[1];
  let configFilePath = LOCAL_CONFIG_FILE;

  /*
    If projectId is null, we will check if the current directory is
    a webstudio project. And load the projectId from it to sync the data.
  */

  if (projectId === undefined) {
    try {
      const content = await readFile(
        join(cwd(), LOCAL_APP_CONFIG_FILE_NAME),
        "utf8"
      );
      const build: Data = JSON.parse(content);
      projectId = build.build.projectId;
      configFilePath = join(cwd(), LOCAL_APP_CONFIG_FILE_NAME);
    } catch (error) {
      spinner.fail("Failed to load project data from config file");
      if (error.code === "ENOENT") {
        throw new Error(
          `Looks like the current directory is not a webstudio project.`
        );
      }
      throw new Error(
        `Failed to load project config from the current directory`
      );
    }
  }

  spinner.text = "Loading project data from config file";
  const config = await loadGlobalConfigFile();
  if (config === null) {
    console.info(
      `Global config file is not found. Please link your project using webstudio link command`
    );
    return;
  }

  const projectConfig = config[projectId];
  if (projectConfig === undefined) {
    spinner.fail("Failed to load project data from config file");
    throw new Error(`Please link your project using webstudio link command`);
  }

  spinner.text = "Loading project data from webstudio";
  const project = await loadProjectDataById({
    projectId,
    authToken: projectConfig.token,
    host: projectConfig.host,
  });

  await ensureFileInPath(configFilePath);
  spinner.text = "Saving project data to config file";
  await writeFile(configFilePath, JSON.stringify(project, null, 2), "utf8");
  spinner.succeed("Project data synced successfully");
};
