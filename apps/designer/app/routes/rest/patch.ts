import { type ActionFunction } from "@remix-run/node";
import { type Build } from "@webstudio-is/project";
import { db } from "@webstudio-is/project/index.server";
import { type SyncItem } from "immerhin";
import { type Tree } from "@webstudio-is/react-sdk";

type PatchData = {
  transactions: Array<SyncItem>;
  treeId: Tree["id"];
  buildId: Build["id"];
};

export const action: ActionFunction = async ({ request }) => {
  const { treeId, buildId, transactions }: PatchData = await request.json();
  if (treeId === undefined) return { errors: "Tree id required" };
  if (buildId === undefined) return { errors: "Build id required" };
  // @todo parallelize the updates
  // currently not possible because we fetch the entire tree
  // and parallelized updates will cause unpredictable side effects
  for await (const transaction of transactions) {
    for await (const change of transaction.changes) {
      const { namespace, patches } = change;

      if (namespace === "root") {
        await db.tree.patchRoot({ treeId }, patches);
      } else if (namespace === "props") {
        await db.props.patch({ treeId }, patches);
      } else if (namespace === "breakpoints") {
        await db.breakpoints.patch(buildId, patches);
      } else {
        return { errors: `Unknown namespace "${namespace}"` };
      }
    }
  }
  return { status: "ok" };
};
