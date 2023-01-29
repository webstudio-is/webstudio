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

type Job = () => Promise<Response>;

const queue: Array<Job> = [];
let failedAttempts = 0;
const MAX_FAILED_BEFORE_WARNING = 3;
// By default we sync every second.
const REQUEST_INTERVAL_DEFAULT = 2000;
// When we reached max failed attempts we will slow down the sync interval.
const REQUEST_INTERVAL_RECOVERY = 5000;
// Periodic check for new entries to put them together in the sync queue.
const NEW_ENTRIES_CHECK_INTERVAL = 1000;

const enqueue = (job: Job) => {
  queue.push(job);
  if (syncStatus.get() === "idle") {
    dequeue();
  }
};

const dequeue = () => {
  const job = queue.shift();
  if (job === undefined) {
    return;
  }
  syncStatus.set("syncing");
  const handleFailure = () => {
    syncStatus.set("idle");
    failedAttempts++;
    queue.unshift(job);
    if (failedAttempts >= MAX_FAILED_BEFORE_WARNING) {
      return setTimeout(dequeue, REQUEST_INTERVAL_RECOVERY);
    }
    setTimeout(dequeue, REQUEST_INTERVAL_DEFAULT);
  };
  job()
    .then((response) => {
      if (response.ok === false) {
        return handleFailure();
      }
      failedAttempts = 0;
      syncStatus.set("idle");
      setTimeout(dequeue, REQUEST_INTERVAL_DEFAULT);
    })
    .catch(handleFailure);
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
    // @todo setInterval can be completely avoided.
    // Right now prisma can't do atomic updates yet with sandbox documents
    // and backend fetches and updates big objects, so if we send quickly,
    // we end up overwriting things
    const intervalId = setInterval(() => {
      const entries = sync();
      if (entries.length === 0) {
        return;
      }

      enqueue(() =>
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
    }, NEW_ENTRIES_CHECK_INTERVAL);
    return () => {
      clearInterval(intervalId);
    };
  }, [treeId, buildId, projectId]);
};
