import { atom } from "nanostores";
import { sync } from "immerhin";
import type { Build, Project } from "@webstudio-is/project";
import type { Tree } from "@webstudio-is/project-build";
import { restPatchPath } from "~/shared/router-utils";
import { useEffect } from "react";

export type SyncStatus = "syncing" | "idle";

export const syncStatus = atom<SyncStatus>("idle");

// @todo because of limitation with nested models and saving tree as a Json type
// we load that entire Json to manipulate and if a second request happens before the first one has written
// the result into the db, the second request will have outdated tree and will then write the outdated tree back
// to the database
// For now we will just have to queue the changes for all tree mutations.

type Job = () => Promise<unknown>;

const queue: Array<Job> = [];

export const enqueue = (job: Job) => {
  queue.push(job);
  if (isInProgress === false) {
    dequeue();
  }
};

let isInProgress = false;

const dequeue = () => {
  const job = queue.shift();
  if (job) {
    isInProgress = true;
    syncStatus.set("syncing");
    job().finally(() => {
      isInProgress = false;
      syncStatus.set("idle");
      dequeue();
    });
  }
};

export const useSyncServer = ({
  treeId,
  buildId,
  projectId,
}: {
  buildId: Build["id"];
  treeId: Tree["id"];
  projectId: Project["id"];
}) => {
  useEffect(() => {
    const intervalId = setInterval(() => {
      // @todo prevent clearing queue in case request is failed
      const entries = sync();
      if (entries.length === 0) {
        return;
      }

      // @todo this entire queueing logic needs to be gone, it's a workaround,
      // because prisma can't do atomic updates yet with sandbox documents
      // and backend fetches and updates big objects, so if we send quickly,
      // we end up overwriting things
      enqueue(() =>
        // @todo start next round only when the request is completed
        fetch(restPatchPath(), {
          method: "post",
          body: JSON.stringify({
            transactions: entries,
            treeId,
            buildId,
            projectId,
          }),
        })
      );
    }, 1000);
    return () => {
      clearInterval(intervalId);
    };
  }, [treeId, buildId, projectId]);
};
