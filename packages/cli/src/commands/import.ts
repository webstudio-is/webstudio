import { cwd, stdin, stdout } from "node:process";
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { cancel, isCancel, log, spinner, text } from "@clack/prompts";
import {
  bundleVersion,
  getBundleVersion,
  getBundleVersionMismatchMessage,
  publishedProjectBundle,
} from "@webstudio-is/protocol";
import { importProjectBundleWithAssets } from "@webstudio-is/http-client";
import { LOCAL_DATA_FILE } from "../config";
import { createLocalAssetDataReader, LOCAL_ASSETS_DIR } from "../asset-files";
import { loadJSONFile } from "../fs-utils";
import { HandledCliError } from "../errors";
import { LOCAL_AUTH_FILE, validateAuthConfigFile } from "../auth-config";
import { apiCompatibilityHeaders, stopSpinnerWithError } from "./api";
import { parseShareLink, validateShareLink } from "./link";
import { formatZodIssues } from "../zod-utils";
import type {
  CommonYargsArgv,
  StrictYargsOptionsToInterface,
} from "./yargs-types";

type ImportProjectDependencies = {
  importProjectBundleWithAssets: typeof importProjectBundleWithAssets;
  loadJSONFile: typeof loadJSONFile;
  readFile: typeof readFile;
  text: typeof text;
  isInteractive: boolean;
  log: Pick<typeof log, "info">;
  spinner: typeof spinner;
};

const isInteractiveTerminal = () =>
  stdin.isTTY === true && stdout.isTTY === true;

const defaultDependencies: ImportProjectDependencies = {
  importProjectBundleWithAssets,
  loadJSONFile,
  readFile,
  text,
  isInteractive: isInteractiveTerminal(),
  log,
  spinner,
};

const missingDestinationMessage =
  "Please specify a destination share link with --to";
const missingProjectBundleMessage =
  "Project bundle is missing. Please run webstudio sync before importing.";
const invalidProjectBundleMessage =
  "Project bundle is invalid. Please run webstudio sync before importing.";
const invalidAuthConfigMessage =
  "Project bundle auth config is invalid. Please run webstudio build before importing.";
const invalidDestinationMessage = "Destination share link is invalid.";

export const importOptions = (yargs: CommonYargsArgv) =>
  yargs
    .option("to", {
      type: "string",
      describe: "Share link with build permissions to import synced data into",
    })
    .option("assets-dir", {
      type: "string",
      default: LOCAL_ASSETS_DIR,
      describe:
        "Directory containing local asset files referenced by the bundle",
    })
    .option("ignore-version-check", {
      type: "boolean",
      describe:
        "Import data without a compatible data version; import may fail if source and target API data formats differ",
    })
    .option("skip-assets", {
      type: "boolean",
      describe:
        "Import project data without uploading or importing asset files; referenced assets may be missing in the target project",
    })
    .check((options) => {
      if (options.to === undefined && isInteractiveTerminal() === false) {
        return missingDestinationMessage;
      }
      return true;
    });

type ImportOptions = Pick<
  Partial<StrictYargsOptionsToInterface<typeof importOptions>>,
  "assetsDir" | "ignoreVersionCheck" | "skipAssets"
> & {
  to?: string;
};

export const importProject = async (
  options: ImportOptions,
  dependencies = defaultDependencies
) => {
  const importing = dependencies.spinner();
  importing.start("Importing project bundle");

  if (options.to === undefined && dependencies.isInteractive === false) {
    importing.stop(missingDestinationMessage, 2);
    throw new HandledCliError();
  }

  importing.message(`Reading ${LOCAL_DATA_FILE}`);

  let data: unknown | null;
  try {
    data = await dependencies.loadJSONFile<unknown>(
      join(cwd(), LOCAL_DATA_FILE)
    );
  } catch {
    importing.stop(invalidProjectBundleMessage, 2);
    throw new HandledCliError();
  }
  if (data === null) {
    importing.stop(missingProjectBundleMessage, 2);
    throw new HandledCliError();
  }

  const localBundleVersion = getBundleVersion(data);
  if (
    localBundleVersion !== bundleVersion &&
    options.ignoreVersionCheck !== true
  ) {
    importing.stop(
      getBundleVersionMismatchMessage({
        ignoreVersionCheckHint:
          "pass --ignore-version-check if you know the source and target data formats are compatible",
        receivedVersion: localBundleVersion,
      }),
      2
    );
    throw new HandledCliError();
  }

  const parsedData = publishedProjectBundle.safeParse(data);
  if (parsedData.success === false) {
    importing.stop(
      `${invalidProjectBundleMessage} Invalid fields: ${formatZodIssues(
        parsedData.error.issues,
        data
      )}`,
      2
    );
    throw new HandledCliError();
  }
  const importData = parsedData.data;

  importing.message(`Reading ${LOCAL_AUTH_FILE}`);
  try {
    if (
      await validateAuthConfigFile({
        data: importData,
        filePath: join(cwd(), LOCAL_AUTH_FILE),
      })
    ) {
      dependencies.log.info(`Read ${LOCAL_AUTH_FILE}`);
    }
  } catch (error) {
    importing.stop(
      error instanceof Error
        ? `${invalidAuthConfigMessage} ${error.message}`
        : invalidAuthConfigMessage,
      2
    );
    throw new HandledCliError();
  }

  let destinationShareLink = options.to;
  if (
    destinationShareLink === undefined &&
    dependencies.isInteractive === true
  ) {
    importing.stop(`Read ${LOCAL_DATA_FILE}`);
    const shareLink = await dependencies.text({
      message: "Please paste a destination share link with build permissions",
      validate: validateShareLink,
    });
    if (isCancel(shareLink)) {
      cancel("Project import is cancelled");
      throw new HandledCliError();
    }
    destinationShareLink = shareLink;
    importing.start("Importing project bundle");
  }
  if (destinationShareLink === undefined) {
    importing.stop(missingDestinationMessage, 2);
    throw new HandledCliError();
  }

  let destination;
  try {
    destination = parseShareLink(destinationShareLink);
  } catch {
    importing.stop(invalidDestinationMessage, 2);
    throw new HandledCliError();
  }

  dependencies.log.info(`Read ${LOCAL_DATA_FILE}`);
  dependencies.log.info(`Destination project: ${destination.projectId}`);
  dependencies.log.info(`Destination origin: ${destination.origin}`);

  const destinationRequest = {
    projectId: destination.projectId,
    authToken: destination.token,
    origin: destination.origin,
    headers: apiCompatibilityHeaders,
  };

  try {
    await dependencies.importProjectBundleWithAssets({
      ...destinationRequest,
      data: importData,
      ignoreVersionCheck: options.ignoreVersionCheck,
      ...(options.skipAssets === true
        ? { skipAssets: true }
        : {
            readAssetData: createLocalAssetDataReader(
              dependencies.readFile,
              options.assetsDir
            ),
          }),
      onUploadAssets: (assets) =>
        importing.message(`Uploading ${assets.length} assets`),
      onMissingAssets: (assets) =>
        importing.message(`Re-uploading ${assets.length} missing assets`),
      onImportAttempt: () =>
        importing.message(
          `Waiting for API response while importing into ${destination.projectId}`
        ),
    });
  } catch (error) {
    stopSpinnerWithError(
      importing,
      error,
      "Unable to import project bundle",
      "import"
    );
    throw new HandledCliError();
  }

  if (options.skipAssets === true) {
    dependencies.log.info("Skipped asset upload and asset rows");
  }
  importing.stop("Project imported successfully");
};
