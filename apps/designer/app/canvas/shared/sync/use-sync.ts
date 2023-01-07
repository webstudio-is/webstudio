import { useInterval } from "react-use";
import { sync } from "immerhin";
import { enqueue } from "./queue";
import type { Build } from "@webstudio-is/project";
import type { Tree } from "@webstudio-is/react-sdk";
import { restPatchPath, restUpdatePath } from "~/shared/router-utils";
import { syncMessages, useSubscribeMessages } from "~/shared/stores";

export const useSync = ({
  treeId,
  buildId,
}: {
  buildId: Build["id"];
  treeId: Tree["id"];
}) => {
  useInterval(() => {
    const entries = sync();
    const messages = syncMessages();
    if (entries.length === 0 && messages.length === 0) {
      return;
    }

    // @todo this entire queueing logic needs to be gone, it's a workaround,
    // because prisma can't do atomic updates yet with sandbox documents
    // and backend fetches and updates big objects, so if we send quickly,
    // we end up overwriting things
    enqueue(async () => {
      if (entries.length !== 0) {
        await fetch(restPatchPath(), {
          method: "post",
          body: JSON.stringify({
            transactions: entries,
            treeId: treeId,
            buildId: buildId,
          }),
        });
      }
      if (messages.length !== 0) {
        await fetch(restUpdatePath(), {
          method: "post",
          body: JSON.stringify(messages),
        });
      }
    });
  }, 1000);

  useSubscribeMessages();
};
