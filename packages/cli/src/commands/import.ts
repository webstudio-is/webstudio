import { cwd } from "node:process";
import { join } from "node:path";
import { log, spinner } from "@clack/prompts";
import {
  getSyncDataVersion,
  syncDataVersion,
  type SyncedProjectData,
} from "@webstudio-is/api-contract";
import { importProjectData } from "@webstudio-is/http-client";
import { LOCAL_DATA_FILE } from "../config";
import { loadJSONFile } from "../fs-utils";
import { HandledCliError } from "../errors";
import { loadAssetFiles } from "../asset-files";
import {
  apiCompatibilityHeaders,
  getSyncDataVersionMismatchMessage,
  stopSpinnerWithError,
} from "./api";
import { parseShareLink } from "./link";
import type {
  CommonYargsArgv,
  StrictYargsOptionsToInterface,
} from "./yargs-types";

type ImportProjectDependencies = {
  importProjectData: typeof importProjectData;
  loadAssetFiles: typeof loadAssetFiles;
  loadJSONFile: typeof loadJSONFile;
  log: Pick<typeof log, "info">;
  spinner: typeof spinner;
};

const defaultDependencies: ImportProjectDependencies = {
  importProjectData,
  loadAssetFiles,
  loadJSONFile,
  log,
  spinner,
};

export const importOptions = (yargs: CommonYargsArgv) =>
  yargs
    .option("to", {
      type: "string",
      describe: "Share link with build permissions to import synced data into",
    })
    .option("ignore-version-check", {
      type: "boolean",
      describe:
        "Import data without a compatible data version; import may fail if source and target API data formats differ",
    })
    .demandOption("to", "Please specify a destination share link");

type ImportOptions = Pick<
  Partial<StrictYargsOptionsToInterface<typeof importOptions>>,
  "ignoreVersionCheck"
> & {
  to: string;
};

export const importProject = async (
  options: ImportOptions,
  dependencies = defaultDependencies
) => {
  const importing = dependencies.spinner();
  importing.start("Importing synchronized project data");

  const destination = (() => {
    try {
      return parseShareLink(options.to);
    } catch {
      importing.stop(`Destination share link is invalid.`, 2);
      throw new HandledCliError();
    }
  })();

  importing.message(`Reading ${LOCAL_DATA_FILE}`);

  const data = await dependencies.loadJSONFile<SyncedProjectData>(
    join(cwd(), LOCAL_DATA_FILE)
  );
  if (data === null) {
    importing.stop(
      `Project data is missing. Please run webstudio sync before importing.`,
      2
    );
    throw new HandledCliError();
  }
  const localSyncDataVersion = getSyncDataVersion(data);
  if (
    localSyncDataVersion !== syncDataVersion &&
    options.ignoreVersionCheck !== true
  ) {
    importing.stop(getSyncDataVersionMismatchMessage(localSyncDataVersion), 2);
    throw new HandledCliError();
  }

  dependencies.log.info(`Read ${LOCAL_DATA_FILE}`);
  dependencies.log.info(`Destination project: ${destination.projectId}`);
  dependencies.log.info(`Destination origin: ${destination.origin}`);

  importing.message(`Reading ${data.assets.length} local asset files`);
  let assetFiles;
  try {
    assetFiles = await dependencies.loadAssetFiles({ assets: data.assets });
  } catch (error) {
    importing.stop(
      error instanceof Error
        ? `Unable to read synchronized asset files: ${error.message}`
        : "Unable to read synchronized asset files",
      2
    );
    throw new HandledCliError();
  }

  importing.message(
    `Waiting for API response while importing into ${destination.projectId}`
  );

  try {
    await dependencies.importProjectData({
      projectId: destination.projectId,
      authToken: destination.token,
      origin: destination.origin,
      data,
      assetFiles,
      ignoreVersionCheck: options.ignoreVersionCheck,
      headers: apiCompatibilityHeaders,
    });
  } catch (error) {
    stopSpinnerWithError(
      importing,
      error,
      "Unable to import project data",
      "import"
    );
    throw new HandledCliError();
  }

  importing.stop("Project data imported successfully");
};
