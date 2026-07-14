import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { cwd } from "node:process";
import { spinner } from "@clack/prompts";
import { type PublishedProjectBundle } from "@webstudio-is/protocol";
import {
  getApiErrorCode,
  loadProjectBundleByBuildId,
  loadProjectBundleByProjectId,
  toLocalProjectBundle,
} from "@webstudio-is/http-client";
import { createFileIfNotExists, isFileExists } from "../fs-utils";
import { LOCAL_DATA_FILE } from "../config";
import type {
  CommonYargsArgv,
  StrictYargsOptionsToInterface,
} from "./yargs-types";
import { HandledCliError } from "../errors";
import { apiCompatibilityHeaders, stopSpinnerWithError } from "./api";
import { downloadAssetFiles } from "../asset-files";
import { resolveApiConnection } from "../api-connection";
import { materializeManagedAgents } from "../managed-agents";

export type SyncDependencies = {
  createFileIfNotExists: typeof createFileIfNotExists;
  downloadAssetFiles: typeof downloadAssetFiles;
  isFileExists: typeof isFileExists;
  loadProjectBundleByBuildId: typeof loadProjectBundleByBuildId;
  loadProjectBundleByProjectId: typeof loadProjectBundleByProjectId;
  readFile: typeof readFile;
  resolveApiConnection: typeof resolveApiConnection;
  spinner: typeof spinner;
  writeFile: typeof writeFile;
  materializeManagedAgents: typeof materializeManagedAgents;
};

export const defaultSyncDependencies: SyncDependencies = {
  createFileIfNotExists,
  downloadAssetFiles,
  isFileExists,
  loadProjectBundleByBuildId,
  loadProjectBundleByProjectId,
  readFile,
  resolveApiConnection,
  spinner,
  writeFile,
  materializeManagedAgents,
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

const unpublishedProjectBundleMessage = [
  "Unable to synchronize project bundle because the project is not published.",
  "`webstudio sync` downloads the published project bundle.",
  "For visual verification of current MCP/API edits, use `preview.start` or `webstudio preview --source session` instead.",
].join("\n");

const isUnpublishedProjectBundleError = (error: unknown) => {
  return getApiErrorCode(error) === "PROJECT_NOT_PUBLISHED";
};

export const sync = async (
  options: SyncOptions,
  dependencies = defaultSyncDependencies
) => {
  const syncing = dependencies.spinner();

  let project: PublishedProjectBundle | undefined;
  syncing.start(`Synchronizing project bundle`);
  const handleProjectBundleError = (error: unknown): never => {
    if (isUnpublishedProjectBundleError(error)) {
      syncing.stop(unpublishedProjectBundleMessage, 2);
      throw new HandledCliError();
    }
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
  };

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
      handleProjectBundleError(error);
    }
  } else {
    let connection: Awaited<ReturnType<typeof resolveApiConnection>>;
    try {
      connection = await dependencies.resolveApiConnection(dependencies);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      syncing.stop(
        message.includes("Local config file")
          ? "Local config file is not found. Please make sure current directory is a webstudio project"
          : message.includes("Project config")
            ? "Project config is not found, please run webstudio link"
            : message,
        2
      );
      throw new HandledCliError();
    }

    const { origin, authToken, projectId } = connection;
    syncing.message(`Synchronizing project bundle from ${origin}`);

    try {
      project =
        options.buildId !== undefined
          ? await dependencies.loadProjectBundleByBuildId({
              buildId: options.buildId,
              authToken,
              origin,
              headers: apiCompatibilityHeaders,
            })
          : await dependencies.loadProjectBundleByProjectId({
              projectId,
              authToken,
              origin,
              headers: apiCompatibilityHeaders,
            });
      project.origin = origin;
    } catch (error) {
      handleProjectBundleError(error);
    }
  }

  if (project === undefined) {
    syncing.stop("Unable to synchronize project bundle", 2);
    throw new HandledCliError();
  }

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
    JSON.stringify(toLocalProjectBundle(project), null, 2),
    "utf8"
  );

  const agents = await dependencies.materializeManagedAgents({
    rootDir: cwd(),
    instructions:
      project.build.projectSettings?.meta.agentInstructions ??
      project.build.pages.meta?.agentInstructions,
  });

  syncing.stop(
    agents.status === "blocked-by-user-file"
      ? `Project bundle synchronized; AGENTS.md blocked by user-owned file at ${agents.path}. Next: webstudio connect`
      : `Project bundle synchronized successfully (AGENTS.md: ${agents.status}). Next: webstudio connect`
  );
};
