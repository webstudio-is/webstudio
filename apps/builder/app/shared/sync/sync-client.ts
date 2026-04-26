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
let unsubscribeAwarenessPresence: (() => void) | undefined;

const logSync = (_message: string, _details?: Record<string, unknown>) => {};

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
  const realtimeCollabHost = publicStaticEnv.COLLAB_RELAY_HOST;
  const useRealtime =
    realtimeCollabHost !== undefined && realtimeCollabHost.length > 0;
  logSync("initialize", {
    projectId,
    authPermit,
    hasAuthToken: authToken !== undefined,
    realtime: useRealtime ? "enabled" : "disabled",
    realtimeCollabHost,
    persistence: useRealtime
      ? "collab-worker"
      : authPermit === "view"
        ? "none"
        : "rest.patch",
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
      useRealtime && realtimeCollabHost !== undefined
        ? createRealtimeSyncEmitter({
            // Shared-link users already have an auth token. Signed-in owners do
            // not, so pass a non-empty session marker; the private service is
            // responsible for turning that into real entitlement validation.
            authToken:
              authPermit === "view" ? undefined : (authToken ?? "session"),
            clientId: realtimeClientId,
            host: realtimeCollabHost,
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
            realtimeEmitter?.connect(data.id);
            unsubscribeAwarenessPresence?.();
            unsubscribeAwarenessPresence = $awareness.listen((awareness) => {
              presenceSendQueue.enqueue(awareness);
            });
          }

          if (authPermit !== "view" && useRealtime === false) {
            logSync("enqueue rest.patch persistence", {
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
  unsubscribeAwarenessPresence?.();
  unsubscribeAwarenessPresence = undefined;
  presenceSendQueue.clear();
  client = undefined;
  currentProjectId = undefined;
  resetDataStores();
  stopPolling();
};

export const getSyncClient = () => client;
