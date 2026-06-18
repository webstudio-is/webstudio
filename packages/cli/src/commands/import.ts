import { cwd } from "node:process";
import { join } from "node:path";
import { log, spinner } from "@clack/prompts";
import {
  importProjectData,
  syncDataVersion,
  type Data,
} from "@webstudio-is/http-client";
import { LOCAL_DATA_FILE } from "../config";
import { loadJSONFile } from "../fs-utils";
import { HandledCliError } from "../errors";
import { apiCompatibilityHeaders, stopSpinnerWithError } from "./api";
import { parseShareLink } from "./link";
import type {
  CommonYargsArgv,
  StrictYargsOptionsToInterface,
} from "./yargs-types";

export const importOptions = (yargs: CommonYargsArgv) =>
  yargs
    .option("to", {
      type: "string",
      describe: "Share link with build permissions to import synced data into",
    })
    .demandOption("to", "Please specify a destination share link");

const getSyncDataVersion = (data: unknown) => {
  if (typeof data !== "object" || data === null) {
    return;
  }
  const version = (data as { syncDataVersion?: unknown }).syncDataVersion;
  return typeof version === "number" ? version : undefined;
};

export const importProject = async (
  options: StrictYargsOptionsToInterface<typeof importOptions>
) => {
  const importing = spinner();
  importing.start("Importing synchronized project data");
  importing.message(`Reading ${LOCAL_DATA_FILE}`);

  const data = await loadJSONFile<Data>(join(cwd(), LOCAL_DATA_FILE));
  if (data === null) {
    importing.stop(
      `Project data is missing. Please run webstudio sync before importing.`,
      2
    );
    return;
  }
  const localSyncDataVersion = getSyncDataVersion(data);
  if (localSyncDataVersion !== syncDataVersion) {
    importing.stop(
      `Synced project data format is incompatible. Expected version ${syncDataVersion}, received ${localSyncDataVersion ?? "missing"}. Please run webstudio sync again and retry the import.`,
      2
    );
    return;
  }

  const destination = parseShareLink(options.to);
  log.info(`Read ${LOCAL_DATA_FILE}`);
  log.info(`Destination project: ${destination.projectId}`);
  log.info(`Destination origin: ${destination.origin}`);
  importing.message(
    `Waiting for API response while importing into ${destination.projectId}`
  );

  try {
    await importProjectData({
      projectId: destination.projectId,
      authToken: destination.token,
      origin: destination.origin,
      data,
      headers: apiCompatibilityHeaders,
    });
  } catch (error) {
    stopSpinnerWithError(importing, error, "Unable to import project data");
    throw new HandledCliError();
  }

  importing.stop("Project data imported successfully");
};
