import type { ActionArgs } from "@remix-run/node";
import type { Build, Project } from "@webstudio-is/project";
import { db as projectDb } from "@webstudio-is/project/server";
import { type SyncItem } from "immerhin";
import type { Tree } from "@webstudio-is/project-build";
import { createContext } from "~/shared/context.server";

type PatchData = {
  transactions: Array<SyncItem>;
  treeId: Tree["id"];
  buildId: Build["id"];
  projectId: Project["id"];
};

export const action = async ({ request }: ActionArgs) => {
  const { treeId, buildId, projectId, transactions }: PatchData =
    await request.json();
  if (treeId === undefined) {
    return { errors: "Tree id required" };
  }
  if (buildId === undefined) {
    return { errors: "Build id required" };
  }
  if (projectId === undefined) {
    return { errors: "Project id required" };
  }

  const context = await createContext(request);

  // @todo parallelize the updates
  // currently not possible because we fetch the entire tree
  // and parallelized updates will cause unpredictable side effects
  for await (const transaction of transactions) {
    for await (const change of transaction.changes) {
      const { namespace, patches } = change;

      if (namespace === "root") {
        await projectDb.tree.patch({ treeId, projectId }, patches, context);
      } else if (namespace === "styles") {
        await projectDb.styles.patch({ treeId, projectId }, patches, context);
      } else if (namespace === "props") {
        await projectDb.props.patch({ treeId, projectId }, patches, context);
      } else if (namespace === "breakpoints") {
        await projectDb.breakpoints.patch(
          { buildId, projectId },
          patches,
          context
        );
      } else {
        return { errors: `Unknown namespace "${namespace}"` };
      }
    }
  }
  return { status: "ok" };
};
