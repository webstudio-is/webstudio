import { useInterval } from "react-use";
import { sync } from "immerhin";
import type { Change } from "immerhin/dist/declarations/src/transaction";
import { enqueue } from "./queue";
import type { Build } from "@webstudio-is/project";
import { Tree } from "@webstudio-is/react-sdk";
import { restPatchPath } from "~/shared/router-utils";
import { Publish } from "~/shared/pubsub";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    patches: Change[];
  }
}

export const useSync = ({
  treeId,
  buildId,
  publish,
  publishPatches,
}: {
  buildId: Build["id"];
  treeId: Tree["id"];
  publish?: Publish;
  publishPatches?: boolean;
}) => {
  useInterval(() => {
    const entries = sync();
    if (entries.length === 0) {
      return;
    }

    // @todo this entire queueing logic needs to be gone, it's a workaround,
    // because prisma can't do atomic updates yet with sandbox documents
    // and backend fetches and updates big objects, so if we send quickly,
    // we end up overwriting things
    enqueue(() =>
      fetch(restPatchPath(), {
        method: "post",
        body: JSON.stringify({
          transactions: entries,
          treeId: treeId,
          buildId: buildId,
        }),
      })
    );

    if (publishPatches) {
      const changes = [];
      for (const entry of entries) {
        for (const change of entry.changes) {
          changes.push(change);
        }
      }
      publish?.({
        type: "patches",
        payload: changes,
      });
    }
  }, 1000);
};
