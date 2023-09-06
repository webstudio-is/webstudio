import { writeFile } from "node:fs/promises";
import { cwd } from "node:process";
import { join } from "node:path";
import ora from "ora";
import { loadProjectDataById } from "@webstudio-is/http-client";

import { ensureFileInPath, loadJSONFile } from "../fs-utils";
import {
  GLOBAL_CONFIG_FILE,
  LOCAL_CONFIG_FILE,
  type GlobalConfig,
  type LocalConfig,
  LOCAL_DATA_FILE,
} from "../config";

export const sync = async () => {
  const spinner = ora("Syncing project data").start();

  spinner.text = "Loading project data from config file";
  const globalConfig = await loadJSONFile<GlobalConfig>(GLOBAL_CONFIG_FILE);
  if (globalConfig === null) {
    spinner.fail(
      `Global config file is not found. Please link your project using webstudio link command`
    );
    return;
  }

  const localConfig = await loadJSONFile<LocalConfig>(
    join(cwd(), LOCAL_CONFIG_FILE)
  );

  if (localConfig === null) {
    spinner.fail(
      `Local config file is not found. Please make sure current directory is a webstudio project`
    );
    return;
  }

  const { host, token } = globalConfig[localConfig.projectId];

  spinner.text = "Loading project data from webstudio\n";
  const project = await loadProjectDataById({
    projectId: localConfig.projectId,
    authToken: token,
    host: host,
  });

  spinner.text = "Saving project data to config file";

  const localBuildFilePath = join(cwd(), LOCAL_DATA_FILE);
  await ensureFileInPath(localBuildFilePath);
  await writeFile(localBuildFilePath, JSON.stringify(project, null, 2), "utf8");

  spinner.succeed("Project data synced successfully");
};
