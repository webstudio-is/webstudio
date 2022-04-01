import { type Project } from "@webstudio-is/sdk";
import type { Config } from "~/config";
import { useSubscribe } from "~/designer/features/canvas-iframe";
import { enqueue } from "./queue";
import { type SyncItem } from "~/lib/sync-engine";

// @todo this entire queueing logic needs to be gone, it's a workaround,
// because prisma can't do atomic updates yet with embeded documents
// and backend fetches and updates big objects, so if we send quickly,
// we end up overwriting things
export const useSync = ({ project }: { config: Config; project: Project }) => {
  useSubscribe<"syncChanges", Array<SyncItem>>(
    "syncChanges",
    (transactions) => {
      enqueue(() =>
        fetch(`/rest/patch`, {
          method: "post",
          body: JSON.stringify({
            transactions,
            treeId: project.devTreeId,
            projectId: project.id,
          }),
        })
      );
    }
  );
};
