import { type SyncStatus } from "~/shared/sync";
import { publish } from "~/shared/pubsub";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    syncStatus: SyncStatus;
  }
}

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
    publish({
      type: "syncStatus",
      payload: "syncing",
    });
    job().finally(() => {
      isInProgress = false;
      publish({
        type: "syncStatus",
        payload: "idle",
      });
      dequeue();
    });
  }
};
