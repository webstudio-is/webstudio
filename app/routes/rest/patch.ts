import { type ActionFunction } from "remix";
import * as db from "~/shared/db";
import { type SyncItem } from "~/lib/sync-engine";
import { type Project, type Tree } from "@webstudio-is/sdk";

const updaters = {
  root: db.tree.patchRoot,
  props: db.props.patch,
};

type UpdaterKey = keyof typeof updaters;

type PatchData = {
  transactions: Array<SyncItem>;
  treeId: Tree["id"];
  projectId: Project["id"];
};

export const action: ActionFunction = async ({ request }) => {
  const { treeId, projectId, transactions }: PatchData = await request.json();
  if (treeId === undefined) return { errors: "Tree id required" };
  if (projectId === undefined) return { errors: "Project id required" };
  // @todo parallelize the updates
  // currently not possible because we fetch the entire tree
  // and parallelized updates will cause unpredictable side effects
  for await (const transaction of transactions) {
    for await (const change of transaction.changes) {
      const { namespace, patches } = change;
      if (namespace in updaters === false) {
        return { errors: `Unknown namespace "${namespace}"` };
      }
      await updaters[namespace as UpdaterKey]({ treeId, projectId }, patches);
    }
  }
  return { status: "ok" };
};
