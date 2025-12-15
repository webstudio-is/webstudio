import type { Build } from "@webstudio-is/project-build";
import type { Project } from "@webstudio-is/project";
import type { AuthPermit } from "@webstudio-is/trpc-interface/index.server";
import { SyncClient } from "~/shared/sync-client";
import { registerContainers, createObjectPool } from "./sync-stores";
import {
  ServerSyncStorage,
  startProjectSync,
  useSyncServer as useSyncServerOriginal,
} from "~/builder/shared/sync/sync-server";
import { loadBuilderData } from "~/shared/builder-data";
import {
  $project,
  $pages,
  $assets,
  $instances,
  $props,
  $dataSources,
  $resources,
  $breakpoints,
  $styleSources,
  $styleSourceSelections,
  $styles,
  $marketplaceProduct,
  $publisherHost,
} from "~/shared/nano-states";

let syncClient: SyncClient | undefined;
let currentProjectId: string | undefined;

/**
 * Initialize the sync infrastructure and load project data.
 * Can be used from both the builder and dashboard contexts.
 */
export const initializeSync = ({
  projectId,
  buildId,
  version,
  authPermit = "own",
  authToken,
  signal,
  onReady,
}: {
  projectId: Project["id"];
  buildId?: Build["id"];
  version?: number;
  authPermit?: AuthPermit;
  authToken?: string;
  signal: AbortSignal;
  onReady?: () => void;
}) => {
  console.log("[sync-init] initializeSync called", {
    projectId,
    buildId,
    version,
    authPermit,
  });

  // Note: We allow "view" permit for loading data from dashboard
  // Only "view" should skip if we need write access later

  // Reset sync client if projectId changed
  if (syncClient && currentProjectId !== projectId) {
    console.log(
      "[sync-init] ProjectId changed, resetting sync client",
      currentProjectId,
      "->",
      projectId
    );
    syncClient = undefined;
  }

  // Only register containers once and create sync client
  if (!syncClient) {
    console.log(
      "[sync-init] Creating new sync client and registering containers"
    );
    registerContainers();
    syncClient = new SyncClient({
      role: "leader",
      object: createObjectPool(),
      storages: [new ServerSyncStorage(projectId)],
    });
    currentProjectId = projectId;
  } else {
    console.log("[sync-init] Reusing existing sync client");
  }

  syncClient.connect({
    signal,
    onReady() {
      console.log("[sync-init] SyncClient connected");

      // Load builder data if we don't have it yet OR if projectId changed
      const currentProjectInStore = $project.get()?.id;
      const needsDataLoad =
        !$pages.get() || currentProjectInStore !== projectId;
      console.log("[sync-init] Needs data load?", needsDataLoad, {
        hasPages: !!$pages.get(),
        currentProjectInStore,
        requestedProjectId: projectId,
      });

      if (!needsDataLoad) {
        // Data already loaded (builder context)
        console.log("[sync-init] Data already loaded, starting sync directly");
        if (buildId && version !== undefined && authPermit !== "view") {
          startProjectSync({
            projectId,
            buildId,
            version,
            authPermit,
            authToken,
          });
        } else if (authPermit === "view") {
          console.log("[sync-init] Skipping project sync - view-only mode");
        }
        console.log("[sync-init] Calling onReady callback");
        onReady?.();
        return;
      }

      console.log("[sync-init] Loading builder data for project", projectId);
      console.log(
        "[sync-init] About to call loadBuilderData with projectId:",
        projectId
      );
      loadBuilderData({ projectId, signal })
        .then((data) => {
          console.log("[sync-init] Builder data loaded", {
            pages: data.pages?.pages?.length,
            instances: data.instances.size,
            assets: data.assets.size,
            version: data.version,
          });

          // Set publisherHost from loaded data (needed for $publishedOrigin computed store)
          $publisherHost.set(data.publisherHost);

          // Set all the stores with loaded data
          $project.set(data.project);
          $pages.set(data.pages);
          $assets.set(data.assets);
          $instances.set(data.instances);
          $props.set(data.props);
          $dataSources.set(data.dataSources);
          $resources.set(data.resources);
          $breakpoints.set(data.breakpoints);
          $styleSources.set(data.styleSources);
          $styleSourceSelections.set(data.styleSourceSelections);
          $styles.set(data.styles);
          $marketplaceProduct.set(data.marketplaceProduct);

          console.log("[sync-init] All stores set");

          // Start project sync with build info from loaded data or params
          const syncBuildId = buildId;
          const syncVersion = version ?? data.version;

          console.log("[sync-init] Starting project sync", {
            syncBuildId,
            syncVersion,
            authPermit,
          });

          // Only start project sync if we have write permissions
          if (
            syncBuildId &&
            syncVersion !== undefined &&
            authPermit !== "view"
          ) {
            startProjectSync({
              projectId,
              buildId: syncBuildId,
              version: syncVersion,
              authPermit,
              authToken,
            });
          } else if (authPermit === "view") {
            console.log("[sync-init] Skipping project sync - view-only mode");
          }

          console.log("[sync-init] Calling onReady callback");
          onReady?.();
        })
        .catch((error) => {
          if (error.name !== "AbortError") {
            console.error("[sync-init] Failed to load project data:", error);
          } else {
            console.log("[sync-init] Load aborted");
          }
        });
    },
  });
};

export const getSyncClient = () => syncClient;

// Re-export useSyncServer for builder usage
export const useSyncServer = useSyncServerOriginal;
