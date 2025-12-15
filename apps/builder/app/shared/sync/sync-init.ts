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
  resetDataStores,
} from "./data-stores";

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
  // Note: We allow "view" permit for loading data from dashboard
  // Only "view" should skip if we need write access later

  // Reset sync client if projectId changed
  if (syncClient && currentProjectId !== projectId) {
    resetDataStores();
    syncClient = undefined;
  }

  // Only register containers once and create sync client
  if (!syncClient) {
    registerContainers();
    syncClient = new SyncClient({
      role: "leader",
      object: createObjectPool(),
      storages: [new ServerSyncStorage(projectId)],
    });
    currentProjectId = projectId;
  }

  syncClient.connect({
    signal,
    onReady() {
      // Load builder data if we don't have it yet OR if projectId changed
      const currentProjectInStore = $project.get()?.id;
      const needsDataLoad =
        !$pages.get() || currentProjectInStore !== projectId;

      if (!needsDataLoad) {
        // Data already loaded (builder context)
        if (buildId && version !== undefined && authPermit !== "view") {
          startProjectSync({
            projectId,
            buildId,
            version,
            authPermit,
            authToken,
          });
        }
        onReady?.();
        return;
      }

      loadBuilderData({ projectId, signal })
        .then((data) => {
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

          // Start project sync with build info from loaded data or params
          const syncBuildId = buildId;
          const syncVersion = version ?? data.version;

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
          }

          onReady?.();
        })
        .catch((error) => {
          if (error.name !== "AbortError") {
            console.error("Failed to load project data:", error);
          }
        });
    },
  });
};

export const getSyncClient = () => syncClient;

// Re-export useSyncServer for builder usage
export const useSyncServer = useSyncServerOriginal;
