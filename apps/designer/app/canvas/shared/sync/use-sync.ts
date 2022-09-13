import useInterval from "react-use/lib/useInterval";
import { sync } from "immerhin";
import { enqueue } from "./queue";
import * as db from "@webstudio-is/project";

export const useSync = ({ project }: { project: db.project.Project }) => {
  useInterval(() => {
    const entries = sync();
    if (entries.length === 0) return;

    // @todo this entire queueing logic needs to be gone, it's a workaround,
    // because prisma can't do atomic updates yet with embeded documents
    // and backend fetches and updates big objects, so if we send quickly,
    // we end up overwriting things
    enqueue(() =>
      fetch(`/rest/patch`, {
        method: "post",
        body: JSON.stringify({
          transactions: entries,
          treeId: project.devTreeId,
          projectId: project.id,
        }),
      })
    );
  }, 1000);
};
