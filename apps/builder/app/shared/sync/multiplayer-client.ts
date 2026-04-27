import type { Project } from "@webstudio-is/project";
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
  const clientId = crypto.randomUUID();
  const emitter = createMultiplayerSyncEmitter({
    getAuthToken: createCollabAuthTokenLoader({
      authPermit,
      authToken,
      buildId: () => buildId,
      projectId,
    }),
    clientId,
    url: relayUrl,
    onReload: async () => {
      try {
        const reloaded = await loadBuilderData({ projectId, signal });
        applyBuilderData(reloaded);
      } catch (error) {
        console.error("[builder-sync] multiplayer reload failed:", error);
      }
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
