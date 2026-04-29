import { readFile, writeFile } from "node:fs/promises";
import { cwd } from "node:process";
import { join } from "node:path";
import pc from "picocolors";
import { spinner } from "@clack/prompts";
import {
  apiClientHeader,
  apiClientVersionHeader,
  getApiCompatibilityPayload,
} from "@webstudio-is/trpc-interface/api-compatibility";
import {
  type Data,
  loadProjectDataByBuildId,
  loadProjectDataByProjectId,
} from "@webstudio-is/http-client";
import packageJson from "../../package.json";
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
import { HandledCliError } from "../errors";

const apiCompatibilityHeaders = {
  [apiClientHeader]: "cli",
  [apiClientVersionHeader]: packageJson.version,
};

const updateCliCommand = "npm install -g webstudio@latest";

const getCliCompatibilityMessage = (error: unknown) => {
  const payload = getApiCompatibilityPayload(error);
  if (payload?.action.type !== "updateCli") {
    return;
  }

  return `${payload.message}

Update the CLI with:
  ${updateCliCommand}

Or run the latest version once with:
  npx webstudio@latest sync`;
};

const stopSyncingWithError = (
  syncing: ReturnType<typeof spinner>,
  error: unknown
) => {
  const compatibilityMessage = getCliCompatibilityMessage(error);
  const message =
    error instanceof Error
      ? error.message
      : "Unable to synchronize project data";
  syncing.stop(compatibilityMessage ?? message, 2);
  return compatibilityMessage;
};

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
    try {
      project = await loadProjectDataByBuildId({
        buildId: options.buildId,
        seviceToken: options.authToken,
        origin: options.origin,
        headers: apiCompatibilityHeaders,
      });
      project.origin = options.origin;
    } catch (error) {
      const compatibilityMessage = stopSyncingWithError(syncing, error);
      if (compatibilityMessage !== undefined) {
        throw new HandledCliError();
      }
      throw error;
    }
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
              headers: apiCompatibilityHeaders,
            })
          : await loadProjectDataByProjectId({
              projectId: localConfig.projectId,
              authToken: token,
              origin,
              headers: apiCompatibilityHeaders,
            });
      project.origin = origin;
    } catch (error) {
      // catch errors about unpublished project
      const compatibilityMessage = stopSyncingWithError(syncing, error);
      if (compatibilityMessage !== undefined) {
        throw new HandledCliError();
      }

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
