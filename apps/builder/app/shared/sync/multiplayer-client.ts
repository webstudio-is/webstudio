import { fetch as builderFetch } from "../fetch.client";
import { refreshPageCopyCatalog } from "./page-copy-catalog.client";
import type { Project } from "@webstudio-is/project";
import { createId } from "@webstudio-is/sdk";
import type { AuthPermit } from "@webstudio-is/trpc-interface/index.server";
import { toast } from "@webstudio-is/design-system";
import { nativeClient } from "~/shared/trpc/trpc-client";
import { loadBuilderData, type LoadedBuilderData } from "~/shared/builder-data";
import {
  createMultiplayerSyncEmitter,
  startMultiplayerPresenceSync,
} from "./multiplayer-sync";
import type { SyncStorage } from "~/shared/sync-client";

export type MultiplayerSyncClient = {
  clientId: string;
  emitter: ReturnType<typeof createMultiplayerSyncEmitter>;
  storages: SyncStorage[];
  destroy(): void;
  onDataLoaded(data: LoadedBuilderData): void;
};

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
}): (() => Promise<string | undefined>) => {
  if (authPermit === "view") {
    return async () => undefined;
  }
  if (authToken !== undefined) {
    return async () => authToken;
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

export const createMultiplayerSyncClient = ({
  applyBuilderData,
  authPermit,
  authToken,
  projectId,
  relayUrl,
  signal,
}: {
  applyBuilderData: (data: LoadedBuilderData) => void;
  authPermit: AuthPermit;
  authToken: string | undefined;
  projectId: Project["id"];
  relayUrl: string;
  signal: AbortSignal;
}): MultiplayerSyncClient => {
  let buildId: string | undefined;
  let unsubscribePresence: (() => void) | undefined;
  const clientId = createId();
  const emitter = createMultiplayerSyncEmitter({
    projectId,
    getAuthToken: createCollabAuthTokenLoader({
      authPermit,
      authToken,
      buildId: () => buildId,
      projectId,
    }),
    clientId,
    url: relayUrl,
    refreshPageCopyCatalog: (catalog, refreshSignal) => {
      const origin = window.location.origin;
      return refreshPageCopyCatalog(
        {
          origin,
          requestOrigin: origin,
          projectId,
          authToken,
          request: builderFetch,
        },
        catalog,
        refreshSignal
      );
    },
    onReload: async (_message, reloadSignal) => {
      signal.throwIfAborted();
      const reloaded = await loadBuilderData({
        projectId,
        signal: reloadSignal,
        silent: true,
      });
      signal.throwIfAborted();
      reloadSignal.throwIfAborted();
      applyBuilderData(reloaded);
      return reloaded.version;
    },
    onUserMessage: (message) => {
      toast.error(message, { id: "multiplayer-sync-message" });
    },
  });

  return {
    clientId,
    emitter,
    storages: [],
    destroy() {
      emitter.close();
      unsubscribePresence?.();
      unsubscribePresence = undefined;
    },
    onDataLoaded(data) {
      buildId = data.id;
      emitter.connect(data.id);
      unsubscribePresence?.();
      unsubscribePresence = startMultiplayerPresenceSync(emitter);
    },
  };
};
