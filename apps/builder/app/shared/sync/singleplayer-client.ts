import type { Project } from "@webstudio-is/project";
import type { Build } from "@webstudio-is/project-build";
import type { AuthPermit } from "@webstudio-is/trpc-interface/index.server";
import type { SyncStorage } from "~/shared/sync-client";
import type { ServerSyncState } from "./sync-stores";
import {
  ServerSyncStorage,
  enqueueProjectDetails,
  stopPolling,
} from "./project-queue";

export type SingleplayerSyncClient = {
  storages: SyncStorage[];
  destroy(): void;
  onDataLoaded(data: { id: Build["id"]; version: number }): void;
};

export const createSingleplayerSyncClient = ({
  authPermit,
  authToken,
  initialServerState,
  projectId,
}: {
  authPermit: AuthPermit;
  authToken: string | undefined;
  initialServerState?: ServerSyncState;
  projectId: Project["id"];
}): SingleplayerSyncClient => {
  return {
    storages:
      authPermit === "view" || initialServerState === undefined
        ? []
        : [new ServerSyncStorage(projectId, initialServerState)],
    destroy() {
      stopPolling();
    },
    onDataLoaded(data) {
      if (authPermit === "view") {
        return;
      }
      enqueueProjectDetails({
        projectId,
        buildId: data.id,
        version: data.version,
        authPermit,
        authToken,
      });
    },
  };
};
