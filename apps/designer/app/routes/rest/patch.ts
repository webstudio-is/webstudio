import { type ActionFunction } from "@remix-run/node";
import { db } from "@webstudio-is/project/index.server";
import { type SyncItem } from "immerhin";
import { type Tree } from "@webstudio-is/react-sdk";
import { type Project } from "@webstudio-is/prisma-client";

const updaters = {
  root: db.tree.patchRoot,
  props: db.props.patch,
  breakpoints: db.breakpoints.patch,
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
