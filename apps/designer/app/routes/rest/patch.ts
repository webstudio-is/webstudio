import { type ActionFunction } from "@remix-run/node";
import { type Build } from "@webstudio-is/project";
import { db } from "@webstudio-is/project/index.server";
import { type SyncItem } from "immerhin";
import { type Tree } from "@webstudio-is/react-sdk";

const updaters = {
  root: db.tree.patchRoot,
  props: db.props.patch,
  breakpoints: db.breakpoints.patch,
};

type UpdaterKey = keyof typeof updaters;

type PatchData = {
  transactions: Array<SyncItem>;
  treeId: Tree["id"];
  buildId: Build["id"]; // @todo use this to update breakpoints
};

export const action: ActionFunction = async ({ request }) => {
  const { treeId, transactions }: PatchData = await request.json();
  if (treeId === undefined) return { errors: "Tree id required" };
  // @todo parallelize the updates
  // currently not possible because we fetch the entire tree
  // and parallelized updates will cause unpredictable side effects
  for await (const transaction of transactions) {
    for await (const change of transaction.changes) {
      const { namespace, patches } = change;
      if (namespace in updaters === false) {
        return { errors: `Unknown namespace "${namespace}"` };
      }
      await updaters[namespace as UpdaterKey]({ treeId }, patches);
    }
  }
  return { status: "ok" };
};
