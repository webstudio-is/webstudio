import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { cwd } from "node:process";
import { spinner } from "@clack/prompts";
import {
  bundleVersion,
  publishedProjectBundle,
  type PublishedProjectBundle,
} from "@webstudio-is/protocol";
import {
  getApiErrorCode,
  loadProjectBundleByBuildId,
  loadBuilderDataByProjectId,
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
import { serializedBuild } from "@webstudio-is/project-build/contracts";
import {
  createBuilderStateFromBuildData,
  createSerializedBuilderBuildDataFromState,
} from "@webstudio-is/project-build/state";
import { migratePages } from "@webstudio-is/project-migrations/pages";
import {
  createReachableAssetContentCompilationPlan,
  getHomePage,
} from "@webstudio-is/sdk";
import { compileContentSource } from "@webstudio-is/content-engine/compiler";
import { parseContentDatabaseMaxBytes } from "@webstudio-is/content-engine";
import { createFileSystemContentSource } from "../filesystem-content-source";
import { z } from "zod";
import {
  breakpoint,
  styleDecl,
  styleSource,
  styleSourceSelection,
  prop,
  instance,
  dataSource,
  resource,
} from "@webstudio-is/sdk/schema";

// Builder data uses arrays rather than the keyed pairs in an export bundle.
const builderData = serializedBuild.extend({
  breakpoints: breakpoint.array(),
  styles: styleDecl.array(),
  styleSources: styleSource.array(),
  styleSourceSelections: styleSourceSelection.array(),
  props: prop.array(),
  instances: instance.array(),
  dataSources: dataSource.array(),
  resources: resource.array(),
  assets: publishedProjectBundle.shape.assets,
  assetFolders: publishedProjectBundle.shape.assetFolders,
  project: z.object({ id: z.string(), title: z.string(), domain: z.string() }),
});

const loadCurrentProjectBundle = async (
  connection: Awaited<ReturnType<typeof resolveApiConnection>>
) => {
  const data = builderData.parse(await loadBuilderDataByProjectId(connection));
  if (
    data.projectId !== connection.projectId ||
    data.project.id !== connection.projectId
  ) {
    throw new Error("Source project does not match the linked project");
  }
  const pages = migratePages(data.pages);
  const state = createBuilderStateFromBuildData({ ...data, pages });
  return publishedProjectBundle.parse({
    bundleVersion,
    origin: connection.origin,
    projectDomain: data.project.domain,
    projectTitle: data.project.title,
    page: getHomePage(pages),
    pages: Array.from(pages.pages.values()),
    assets: data.assets,
    assetFolders: data.assetFolders,
    build: { ...data, ...createSerializedBuilderBuildDataFromState(state) },
  });
};

export type SyncDependencies = {
  createFileIfNotExists: typeof createFileIfNotExists;
  downloadAssetFiles: typeof downloadAssetFiles;
  isFileExists: typeof isFileExists;
  loadProjectBundleByBuildId: typeof loadProjectBundleByBuildId;
  loadCurrentProjectBundle: typeof loadCurrentProjectBundle;
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
  loadCurrentProjectBundle,
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
  "The selected build cannot be exported.",
  "Run `webstudio sync` without --buildId to export the current saved project without publishing.",
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
          : await dependencies.loadCurrentProjectBundle({
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

  if (options.buildId === undefined) {
    const plan = createReachableAssetContentCompilationPlan({
      props: project.build.props.map(([, value]) => value),
      dataSources: project.build.dataSources.map(([, value]) => value),
      resources: project.build.resources.map(([, value]) => value),
    });
    if (plan !== undefined) {
      syncing.message("Preparing local content index");
      const { artifact } = await compileContentSource({
        source: createFileSystemContentSource({
          projectId: project.build.projectId,
          assets: project.assets,
          folders: new Map(
            (project.assetFolders ?? []).map((folder) => [folder.id, folder])
          ),
        }),
        projectId: project.build.projectId,
        plan,
        maxBytes: parseContentDatabaseMaxBytes(
          process.env.CONTENT_DATABASE_MAX_BYTES
        ),
      });
      project.assetIndex = artifact;
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
      ? `Project bundle synchronized; AGENTS.md blocked by user-owned file at ${agents.path}. Next: webstudio build`
      : `Project bundle synchronized successfully (AGENTS.md: ${agents.status}). Next: webstudio build`
  );
};
