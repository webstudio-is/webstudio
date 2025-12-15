import type { Project } from "@webstudio-is/project";
import type { AuthPermit } from "@webstudio-is/trpc-interface/index.server";
import { SyncClient } from "~/shared/sync-client";
import { registerContainers, createObjectPool } from "./sync-stores";
import {
  ServerSyncStorage,
  enqueueProjectDetails,
  stopPolling,
} from "./project-queue";
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

let client: SyncClient | undefined;
let currentProjectId: string | undefined;

/**
 * Initialize the sync infrastructure and load project data.
 * Can be used from both the builder and dashboard contexts.
 */
export const initializeClientSync = ({
  projectId,
  authPermit,
  authToken,
  signal,
  onReady,
}: {
  projectId: Project["id"];
  authPermit: AuthPermit;
  authToken?: string;
  signal: AbortSignal;
  onReady?: () => void;
}) => {
  // Note: "view" permit will skip transaction synchronization

  // Reset sync client if projectId changed
  if (client && currentProjectId !== projectId) {
    destroyClientSync();
    client = undefined;
  }

  // Only register containers once and create sync client
  if (!client) {
    registerContainers();
    client = new SyncClient({
      role: "leader",
      object: createObjectPool(),
      storages: [new ServerSyncStorage(projectId)],
    });
    currentProjectId = projectId;
  }

  client.connect({
    signal,
    onReady() {
      // Load builder data if we don't have it yet OR if projectId changed
      const currentProjectInStore = $project.get()?.id;
      const needsDataLoad =
        !$pages.get() || currentProjectInStore !== projectId;

      loadBuilderData({ projectId, signal })
        .then((data) => {
          if (needsDataLoad) {
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
          }

          // Start project sync with build info from loaded data
          if (authPermit !== "view") {
            enqueueProjectDetails({
              projectId,
              buildId: data.id,
              version: data.version,
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

/**
 * Destroy sync client and reset all data stores.
 * Call this when closing the builder or switching between projects.
 */
export const destroyClientSync = () => {
  resetDataStores();
  stopPolling();
};

export const getSyncClient = () => client;
