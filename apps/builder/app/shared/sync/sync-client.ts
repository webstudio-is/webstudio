import type { Project } from "@webstudio-is/project";
import type { AuthPermit } from "@webstudio-is/trpc-interface/index.server";
import { SyncClient } from "~/shared/sync-client";
import { registerContainers, createObjectPool } from "./sync-stores";
import {
  ServerSyncStorage,
  enqueueProjectDetails,
  stopPolling,
} from "./project-queue";
import { loadBuilderData, type LoadedBuilderData } from "~/shared/builder-data";
import { publicStaticEnv } from "~/env/env.static";
import { nativeClient } from "~/shared/trpc/trpc-client";
import { $awareness, type Awareness } from "~/shared/awareness";
import { toast } from "@webstudio-is/design-system";
import {
  createRealtimeSyncEmitter,
  type RealtimeSyncEmitter,
} from "./realtime-sync";
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
let realtimeEmitter: RealtimeSyncEmitter | undefined;
let realtimeBuildId: string | undefined;
let unsubscribeAwarenessPresence: (() => void) | undefined;

const logSync = (_message: string, _details?: Record<string, unknown>) => {};

const createCollabAuthTokenLoader = ({
  authPermit,
  authToken,
  buildId,
  projectId,
}: {
  authPermit: AuthPermit;
  authToken: string | undefined;
  buildId: () => string | undefined;
  projectId: Project["id"];
}) => {
  if (authPermit === "view") {
    return undefined;
  }
  if (authToken !== undefined) {
    return authToken;
  }
  return async () => {
    const currentBuildId = buildId();
    if (currentBuildId === undefined) {
      throw new Error("Build id is not ready for collaboration token");
    }
    const result = await nativeClient.build.createCollabToken.query({
      buildId: currentBuildId,
      projectId,
    });
    return result.token;
  };
};

export const createPresenceSendQueue = (
  sendPresence: (awareness: Awareness) => void
) => {
  let queuedAwareness: Awareness | undefined;
  let isPresenceSendQueued = false;

  return {
    enqueue(awareness: Awareness) {
      queuedAwareness = awareness;
      if (isPresenceSendQueued) {
        return;
      }
      isPresenceSendQueued = true;
      queueMicrotask(() => {
        isPresenceSendQueued = false;
        if (queuedAwareness !== undefined) {
          sendPresence(queuedAwareness);
        }
      });
    },
    clear() {
      queuedAwareness = undefined;
      isPresenceSendQueued = false;
    },
  };
};

let presenceSendQueue = createPresenceSendQueue((awareness) => {
  realtimeEmitter?.sendPresence(awareness);
});

const resolveRealtimeCollabUrl = (url: string) => {
  if (typeof window === "undefined") {
    return url;
  }
  try {
    const collabUrl = new URL(url);
    if (
      collabUrl.hostname === "wstd.dev" &&
      (window.location.hostname === "wstd.dev" ||
        window.location.hostname.endsWith(".wstd.dev"))
    ) {
      const currentOrigin = new URL(window.location.origin);
      collabUrl.protocol = currentOrigin.protocol;
      collabUrl.hostname = currentOrigin.hostname;
      collabUrl.port = currentOrigin.port;
      return collabUrl.toString();
    }
  } catch {
    return url;
  }
  return url;
};

const applyBuilderData = (data: LoadedBuilderData) => {
  $publisherHost.set(data.publisherHost);
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
};

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
  const realtimeCollabUrl =
    publicStaticEnv.COLLAB_RELAY_URL === undefined
      ? undefined
      : resolveRealtimeCollabUrl(publicStaticEnv.COLLAB_RELAY_URL);
  const useRealtime =
    realtimeCollabUrl !== undefined && realtimeCollabUrl.length > 0;
  logSync("initialize", {
    projectId,
    authPermit,
    hasAuthToken: authToken !== undefined,
    realtime: useRealtime ? "enabled" : "disabled",
    realtimeCollabUrl,
    persistence: useRealtime
      ? "collab-worker"
      : authPermit === "view"
        ? "none"
        : "build.patch",
  });

  // Note: "view" permit will skip transaction synchronization

  // Reset sync client if projectId changed
  if (client && currentProjectId !== projectId) {
    logSync("project changed; destroying previous client", {
      previousProjectId: currentProjectId,
      nextProjectId: projectId,
    });
    destroyClientSync();
  }

  // Only register containers once and create sync client
  if (!client) {
    registerContainers();
    const object = createObjectPool();
    const realtimeClientId = crypto.randomUUID();
    const emitter =
      useRealtime && realtimeCollabUrl !== undefined
        ? createRealtimeSyncEmitter({
            authToken: createCollabAuthTokenLoader({
              authPermit,
              authToken,
              buildId: () => realtimeBuildId,
              projectId,
            }),
            clientId: realtimeClientId,
            url: realtimeCollabUrl,
            onReload: async (message) => {
              logSync("realtime reload requested", {
                reason: message.reason,
                errors: message.errors,
              });
              try {
                const reloaded = await loadBuilderData({ projectId, signal });
                applyBuilderData(reloaded);
              } catch (error) {
                console.error("[builder-sync] realtime reload failed:", error);
              }
            },
            onUserMessage: (message) => {
              toast.error(message, { id: "realtime-sync-message" });
            },
          })
        : undefined;
    realtimeEmitter = emitter;
    client = new SyncClient({
      role: "leader",
      object,
      emitter,
      storages:
        useRealtime || authPermit === "view"
          ? []
          : [new ServerSyncStorage(projectId)],
    });
    if (useRealtime) {
      client.clientId = realtimeClientId;
    }
    currentProjectId = projectId;
    logSync("client created", {
      clientId: client.clientId,
      projectId,
      role: client.role,
      realtime: useRealtime ? "enabled" : "disabled",
      storages: useRealtime || authPermit === "view" ? 0 : 1,
    });
  }

  client.connect({
    signal,
    onReady() {
      logSync("client ready; loading builder data", { projectId });
      loadBuilderData({ projectId, signal })
        .then((data) => {
          logSync("builder data loaded", {
            projectId,
            buildId: data.id,
            version: data.version,
            realtime: useRealtime ? "enabled" : "disabled",
          });
          applyBuilderData(data);

          if (useRealtime) {
            realtimeBuildId = data.id;
            realtimeEmitter?.connect(data.id);
            unsubscribeAwarenessPresence?.();
            unsubscribeAwarenessPresence = $awareness.listen((awareness) => {
              presenceSendQueue.enqueue(awareness);
            });
          }

          if (authPermit !== "view" && useRealtime === false) {
            logSync("enqueue build.patch persistence", {
              projectId,
              buildId: data.id,
              version: data.version,
              hasAuthToken: authToken !== undefined,
            });
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
          if (!signal.aborted) {
            console.error("[builder-sync] failed to load project data:", error);
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
  logSync("destroy", {
    projectId: currentProjectId,
    hadClient: client !== undefined,
  });
  realtimeEmitter?.close();
  realtimeEmitter = undefined;
  realtimeBuildId = undefined;
  unsubscribeAwarenessPresence?.();
  unsubscribeAwarenessPresence = undefined;
  presenceSendQueue.clear();
  client = undefined;
  currentProjectId = undefined;
  resetDataStores();
  stopPolling();
};

export const getSyncClient = () => client;
