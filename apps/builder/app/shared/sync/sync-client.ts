import type { Project } from "@webstudio-is/project";
import type { AuthPermit } from "@webstudio-is/trpc-interface/index.server";
import type { SyncEmitter } from "@webstudio-is/sync-client";
import { SyncClient, type SyncStorage } from "~/shared/sync-client";
import {
  createObjectPool,
  registerContainers,
  serverSyncStoreNames,
  type ServerSyncState,
} from "./sync-stores";
import { loadBuilderData, type LoadedBuilderData } from "~/shared/builder-data";
import { publicStaticEnv } from "~/env/env.static";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import { createSingleplayerSyncClient } from "./singleplayer-client";
import { createMultiplayerSyncClient } from "./multiplayer-client";
import {
  $project,
  $pages,
  $assets,
  $assetFolders,
  $instances,
  $props,
  $dataSources,
  $resources,
  $breakpoints,
  $styleSources,
  $styleSourceSelections,
  $styles,
  $marketplaceProduct,
  $projectSettings,
  $publisherHost,
  resetDataStores,
} from "./data-stores";

let client: SyncClient | undefined;
let currentProjectId: string | undefined;
let modeClient: SyncModeClient | undefined;
let initializationVersion = 0;

type SyncModeClient = {
  clientId?: string;
  emitter?: SyncEmitter;
  storages: SyncStorage[];
  destroy(): void;
  onDataLoaded(data: LoadedBuilderData): void;
};

const resolveMultiplayerRelayUrl = (
  relayUrl: string,
  currentHref = typeof window === "undefined" ? undefined : window.location.href
) => {
  if (currentHref === undefined) {
    return relayUrl;
  }
  const currentUrl = new URL(currentHref);
  const configuredUrl = new URL(relayUrl, currentUrl.origin);
  const isRelativeRelayUrl =
    relayUrl.startsWith("/") || relayUrl.startsWith(".");
  const isLocalWstdDev =
    currentUrl.hostname === "wstd.dev" ||
    currentUrl.hostname.endsWith(".wstd.dev");

  if (isRelativeRelayUrl && isLocalWstdDev && currentUrl.port === "5173") {
    return new URL(configuredUrl.pathname, currentUrl.origin).href;
  }

  return configuredUrl.href;
};

const applyBuilderData = (data: LoadedBuilderData) => {
  applyBuilderMetadata(data);
  $pages.set(data.pages);
  $assets.set(data.assets);
  $assetFolders.set(data.assetFolders);
  $instances.set(data.instances);
  $props.set(data.props);
  $dataSources.set(data.dataSources);
  $resources.set(data.resources);
  $breakpoints.set(data.breakpoints);
  $styleSources.set(data.styleSources);
  $styleSourceSelections.set(data.styleSourceSelections);
  $styles.set(data.styles);
  $marketplaceProduct.set(data.marketplaceProduct);
  $projectSettings.set(data.projectSettings);
};

const applyBuilderMetadata = (data: LoadedBuilderData) => {
  $publisherHost.set(data.publisherHost);
  $project.set(data.project);
};

const getServerSyncState = (data: LoadedBuilderData): ServerSyncState =>
  new Map(serverSyncStoreNames.map((name) => [name, data[name]]));

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
  const multiplayerRelayUrl = isFeatureEnabled("multiplayer")
    ? publicStaticEnv.COLLAB_RELAY_URL?.trim() || undefined
    : undefined;
  const resolvedMultiplayerRelayUrl =
    multiplayerRelayUrl === undefined
      ? undefined
      : resolveMultiplayerRelayUrl(multiplayerRelayUrl);
  const useMultiplayer = resolvedMultiplayerRelayUrl !== undefined;
  if (useMultiplayer) {
    console.info("[builder-sync] multiplayer mode enabled", {
      projectId,
      relayUrl: resolvedMultiplayerRelayUrl,
    });
  }
  const shouldPreloadStorage =
    useMultiplayer === false && authPermit !== "view";

  // Note: "view" permit will skip transaction synchronization

  // Reset sync client if projectId changed
  if (client && currentProjectId !== projectId) {
    destroyClientSync();
  }

  const currentInitializationVersion = ++initializationVersion;

  const loadData = (onSuccess: (data: LoadedBuilderData) => void) => {
    loadBuilderData({ projectId, signal })
      .then((data) => {
        if (
          signal.aborted ||
          currentInitializationVersion !== initializationVersion
        ) {
          return;
        }
        onSuccess(data);
      })
      .catch((error) => {
        if (
          signal.aborted === false &&
          currentInitializationVersion === initializationVersion
        ) {
          console.error("[builder-sync] failed to load project data:", error);
        }
      });
  };

  const completeDataLoad = (data: LoadedBuilderData) => {
    applyBuilderData(data);
    modeClient?.onDataLoaded(data);
    onReady?.();
  };

  const connectClient = (initialData?: LoadedBuilderData) => {
    registerContainers();
    const object = createObjectPool();
    const nextModeClient: SyncModeClient =
      useMultiplayer && resolvedMultiplayerRelayUrl !== undefined
        ? createMultiplayerSyncClient({
            applyBuilderData,
            authPermit,
            authToken,
            projectId,
            relayUrl: resolvedMultiplayerRelayUrl,
            signal,
          })
        : createSingleplayerSyncClient({
            authPermit,
            authToken,
            initialServerState:
              initialData === undefined
                ? undefined
                : getServerSyncState(initialData),
            projectId,
          });
    modeClient = nextModeClient;
    client = new SyncClient({
      role: "leader",
      object,
      emitter: nextModeClient.emitter,
      storages: nextModeClient.storages,
    });
    if (nextModeClient.clientId !== undefined) {
      client.clientId = nextModeClient.clientId;
    }
    currentProjectId = projectId;

    client.connect({
      signal,
      onReady() {
        if (initialData !== undefined) {
          applyBuilderMetadata(initialData);
          modeClient?.onDataLoaded(initialData);
          onReady?.();
          return;
        }

        loadData(completeDataLoad);
      },
    });
  };

  // Only register containers once and create sync client
  if (!client) {
    if (shouldPreloadStorage) {
      loadData(connectClient);
      return;
    }

    connectClient();
    return;
  }

  client.connect({
    signal,
    onReady() {
      loadData(completeDataLoad);
    },
  });
};

/**
 * Destroy sync client and reset all data stores.
 * Call this when closing the builder or switching between projects.
 */
export const destroyClientSync = () => {
  initializationVersion += 1;
  modeClient?.destroy();
  modeClient = undefined;
  client = undefined;
  currentProjectId = undefined;
  resetDataStores();
};

export const getSyncClient = () => client;

export const __testing__ = {
  getServerSyncState,
  resolveMultiplayerRelayUrl,
};
