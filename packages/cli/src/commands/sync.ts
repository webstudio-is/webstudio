import { readFile, writeFile } from "node:fs/promises";
import { cwd } from "node:process";
import { join } from "node:path";
import pc from "picocolors";
import { spinner } from "@clack/prompts";
import {
  loadProjectDataByBuildId,
  loadProjectDataByProjectId,
  type Data,
} from "@webstudio-is/http-client";
import { createFileIfNotExists, isFileExists } from "../fs-utils";
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
    .option("origin", {
      type: "string",
      describe: "[Experimental] Remote origin to sync with",
    })
    .option("authToken", {
      type: "string",
      describe: "[Experimental] Service token",
    });

export const sync = async (
  options: StrictYargsOptionsToInterface<typeof syncOptions>
) => {
  const syncing = spinner();

  let project: Data | undefined;
  syncing.start(`Synchronizing project data`);

  if (
    options.buildId !== undefined &&
    options.origin !== undefined &&
    options.authToken !== undefined
  ) {
    syncing.message(`Synchronizing project data from ${options.origin}`);
    project = await loadProjectDataByBuildId({
      buildId: options.buildId,
      seviceToken: options.authToken,
      origin: options.origin,
    });
    project.origin = options.origin;
  } else {
    const globalConfigText = await readFile(GLOBAL_CONFIG_FILE, "utf-8");
    const globalConfig = jsonToGlobalConfig(JSON.parse(globalConfigText));

    if ((await isFileExists(LOCAL_CONFIG_FILE)) === false) {
      syncing.stop(
        `Local config file is not found. Please make sure current directory is a webstudio project`,
        2
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
      syncing.stop(
        `Project config is not found, please run ${pc.dim("webstudio link")}`,
        2
      );
      return;
    }

    const { origin, token } = projectConfig;
    syncing.message(`Synchronizing project data from ${origin}`);

    try {
      project =
        options.buildId !== undefined
          ? await loadProjectDataByBuildId({
              buildId: options.buildId,
              authToken: token,
              origin,
            })
          : await loadProjectDataByProjectId({
              projectId: localConfig.projectId,
              authToken: token,
              origin,
            });
      project.origin = origin;
    } catch (error) {
      // catch errors about unpublished project
      syncing.stop((error as Error).message, 2);

      throw error;
    }
  }

  // Check that project defined
  project satisfies Data;

  const localBuildFilePath = join(cwd(), LOCAL_DATA_FILE);
  await createFileIfNotExists(localBuildFilePath);
  await writeFile(localBuildFilePath, JSON.stringify(project, null, 2), "utf8");

  syncing.stop("Project data synchronized successfully");
};
