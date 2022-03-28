import useInterval from "react-use/lib/useInterval";
import { sync, SyncItem } from "~/lib/sync-engine";
import { publish } from "./pubsub";

export const usePeriodicSync = () => {
  useInterval(() => {
    const entries = sync();
    if (entries.length === 0) return;
    publish<"syncChanges", Array<SyncItem>>({
      type: "syncChanges",
      payload: entries,
    });
  }, 1000);
};
