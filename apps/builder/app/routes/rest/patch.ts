import type { ActionArgs } from "@remix-run/node";
import type { SyncItem } from "immerhin";
import type { Build, Tree } from "@webstudio-is/project-build";
import {
  patchBreakpoints,
  patchProps,
  patchStyles,
  patchStyleSources,
  patchStyleSourceSelections,
  patchInstances,
} from "@webstudio-is/project-build/server";
import type { Project } from "@webstudio-is/project";
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

      if (namespace === "instances") {
        await patchInstances({ treeId, projectId }, patches, context);
      } else if (namespace === "styleSourceSelections") {
        await patchStyleSourceSelections(
          { buildId, projectId },
          patches,
          context
        );
      } else if (namespace === "styleSources") {
        await patchStyleSources({ buildId, projectId }, patches, context);
      } else if (namespace === "styles") {
        await patchStyles({ buildId, projectId }, patches, context);
      } else if (namespace === "props") {
        await patchProps({ buildId, projectId }, patches, context);
      } else if (namespace === "breakpoints") {
        await patchBreakpoints({ buildId, projectId }, patches, context);
      } else {
        return { errors: `Unknown namespace "${namespace}"` };
      }
    }
  }
  return { status: "ok" };
};
