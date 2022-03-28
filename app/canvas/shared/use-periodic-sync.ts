import useInterval from "react-use/lib/useInterval";
import { sync, SyncQueueEntry } from "~/lib/sync-engine";
import { publish } from "./pubsub";

export const usePeriodicSync = () => {
  useInterval(() => {
    const entries = sync();
    if (entries.length === 0) return;
    publish<"syncChanges", Array<SyncQueueEntry>>({
      type: "syncChanges",
      payload: entries,
    });
  }, 1000);
};
