import { cwd, stdin, stdout } from "node:process";
import { join } from "node:path";
import { cancel, isCancel, log, spinner, text } from "@clack/prompts";
import {
  getProjectBundleVersion,
  getProjectBundleVersionMismatchMessage,
  publishedProjectBundleSchema,
  projectBundleVersion,
} from "@webstudio-is/bundle";
import {
  checkProjectBuildPermission,
  importProjectBundle,
} from "@webstudio-is/http-client";
import { LOCAL_DATA_FILE } from "../config";
import { loadJSONFile } from "../fs-utils";
import { HandledCliError } from "../errors";
import { loadAssetFiles } from "../asset-files";
import { apiCompatibilityHeaders, stopSpinnerWithError } from "./api";
import { parseShareLink, validateShareLink } from "./link";
import { formatZodIssues } from "../zod-utils";
import type {
  CommonYargsArgv,
  StrictYargsOptionsToInterface,
} from "./yargs-types";

type ImportProjectDependencies = {
  checkProjectBuildPermission: typeof checkProjectBuildPermission;
  importProjectBundle: typeof importProjectBundle;
  loadAssetFiles: typeof loadAssetFiles;
  loadJSONFile: typeof loadJSONFile;
  text: typeof text;
  isInteractive: boolean;
  log: Pick<typeof log, "info">;
  spinner: typeof spinner;
};

const isInteractiveTerminal = () =>
  stdin.isTTY === true && stdout.isTTY === true;

const defaultDependencies: ImportProjectDependencies = {
  checkProjectBuildPermission,
  importProjectBundle,
  loadAssetFiles,
  loadJSONFile,
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
const invalidDestinationMessage = "Destination share link is invalid.";

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
    .check((options) => {
      if (options.to === undefined && isInteractiveTerminal() === false) {
        return missingDestinationMessage;
      }
      return true;
    });

type ImportOptions = Pick<
  Partial<StrictYargsOptionsToInterface<typeof importOptions>>,
  "ignoreVersionCheck"
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
  const localProjectBundleVersion = getProjectBundleVersion(data);
  if (
    localProjectBundleVersion !== projectBundleVersion &&
    options.ignoreVersionCheck !== true
  ) {
    importing.stop(
      getProjectBundleVersionMismatchMessage({
        ignoreVersionCheckHint:
          "pass --ignore-version-check if you know the source and target data formats are compatible",
        receivedVersion: localProjectBundleVersion,
      }),
      2
    );
    throw new HandledCliError();
  }
  const parsedData = publishedProjectBundleSchema.safeParse(data);
  if (parsedData.success === false) {
    importing.stop(
      `${invalidProjectBundleMessage} Invalid fields: ${formatZodIssues(
        parsedData.error.issues
      )}`,
      2
    );
    throw new HandledCliError();
  }
  const importData = parsedData.data;

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

  importing.message("Checking destination build permission");
  try {
    await dependencies.checkProjectBuildPermission(destinationRequest);
  } catch (error) {
    stopSpinnerWithError(
      importing,
      error,
      "Unable to check destination build permission",
      "import"
    );
    throw new HandledCliError();
  }

  importing.message(`Reading ${importData.assets.length} local asset files`);
  let assetFiles;
  try {
    assetFiles = await dependencies.loadAssetFiles({
      assets: importData.assets,
    });
  } catch (error) {
    importing.stop(
      error instanceof Error
        ? `Unable to read project bundle asset files: ${error.message}`
        : "Unable to read project bundle asset files",
      2
    );
    throw new HandledCliError();
  }

  importing.message(
    `Waiting for API response while importing into ${destination.projectId}`
  );

  try {
    await dependencies.importProjectBundle({
      ...destinationRequest,
      data: importData,
      assetFiles,
      ignoreVersionCheck: options.ignoreVersionCheck,
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

  importing.stop("Project bundle imported successfully");
};
