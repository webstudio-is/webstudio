import { readFile, writeFile } from "node:fs/promises";
import { cwd } from "node:process";
import { join } from "node:path";
import pc from "picocolors";
import { spinner } from "@clack/prompts";
import type { PublishedProjectBundle } from "@webstudio-is/bundle";
import {
  loadProjectBundleByBuildId,
  loadProjectBundleByProjectId,
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
import { HandledCliError } from "../errors";
import { apiCompatibilityHeaders, stopSpinnerWithError } from "./api";
import { downloadAssetFiles } from "../asset-files";

type SyncDependencies = {
  createFileIfNotExists: typeof createFileIfNotExists;
  downloadAssetFiles: typeof downloadAssetFiles;
  isFileExists: typeof isFileExists;
  loadProjectBundleByBuildId: typeof loadProjectBundleByBuildId;
  loadProjectBundleByProjectId: typeof loadProjectBundleByProjectId;
  readFile: typeof readFile;
  spinner: typeof spinner;
  writeFile: typeof writeFile;
};

const defaultDependencies: SyncDependencies = {
  createFileIfNotExists,
  downloadAssetFiles,
  isFileExists,
  loadProjectBundleByBuildId,
  loadProjectBundleByProjectId,
  readFile,
  spinner,
  writeFile,
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

type SyncOptions = Partial<StrictYargsOptionsToInterface<typeof syncOptions>>;

export const sync = async (
  options: SyncOptions,
  dependencies = defaultDependencies
) => {
  const syncing = dependencies.spinner();

  let project: PublishedProjectBundle | undefined;
  syncing.start(`Synchronizing project bundle`);

  if (
    options.buildId !== undefined &&
    options.origin !== undefined &&
    options.authToken !== undefined
  ) {
    syncing.message(`Synchronizing project bundle from ${options.origin}`);
    try {
      project = await dependencies.loadProjectBundleByBuildId({
        buildId: options.buildId,
        serviceToken: options.authToken,
        origin: options.origin,
        headers: apiCompatibilityHeaders,
      });
      project.origin = options.origin;
    } catch (error) {
      const compatibilityMessage = stopSpinnerWithError(
        syncing,
        error,
        "Unable to synchronize project bundle",
        "sync"
      );
      if (compatibilityMessage !== undefined) {
        throw new HandledCliError();
      }
      throw error;
    }
  } else {
    const globalConfigText = await dependencies.readFile(
      GLOBAL_CONFIG_FILE,
      "utf-8"
    );
    const globalConfig = jsonToGlobalConfig(JSON.parse(globalConfigText));

    if ((await dependencies.isFileExists(LOCAL_CONFIG_FILE)) === false) {
      syncing.stop(
        `Local config file is not found. Please make sure current directory is a webstudio project`,
        2
      );
      throw new HandledCliError();
    }

    const localConfigText = await dependencies.readFile(
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
      throw new HandledCliError();
    }

    const { origin, token } = projectConfig;
    syncing.message(`Synchronizing project bundle from ${origin}`);

    try {
      project =
        options.buildId !== undefined
          ? await dependencies.loadProjectBundleByBuildId({
              buildId: options.buildId,
              authToken: token,
              origin,
              headers: apiCompatibilityHeaders,
            })
          : await dependencies.loadProjectBundleByProjectId({
              projectId: localConfig.projectId,
              authToken: token,
              origin,
              headers: apiCompatibilityHeaders,
            });
      project.origin = origin;
    } catch (error) {
      // catch errors about unpublished project
      const compatibilityMessage = stopSpinnerWithError(
        syncing,
        error,
        "Unable to synchronize project bundle",
        "sync"
      );
      if (compatibilityMessage !== undefined) {
        throw new HandledCliError();
      }

      throw error;
    }
  }

  // Check that project defined
  project satisfies PublishedProjectBundle;

  if (project.assets.length > 0) {
    syncing.message(`Downloading ${project.assets.length} asset files`);
    if (project.origin === undefined) {
      syncing.stop("Asset origin is missing from project bundle", 2);
      throw new HandledCliError();
    }
    try {
      await dependencies.downloadAssetFiles({
        assets: project.assets,
        origin: project.origin,
      });
    } catch (error) {
      stopSpinnerWithError(
        syncing,
        error,
        "Unable to synchronize project asset files",
        "sync"
      );
      throw new HandledCliError();
    }
  }

  const localBuildFilePath = join(cwd(), LOCAL_DATA_FILE);
  await dependencies.createFileIfNotExists(localBuildFilePath);
  await dependencies.writeFile(
    localBuildFilePath,
    JSON.stringify(project, null, 2),
    "utf8"
  );

  syncing.stop("Project bundle synchronized successfully");
};
