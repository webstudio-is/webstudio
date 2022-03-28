import { type ActionFunction } from "remix";
import * as db from "~/shared/db";
import { type SyncItem } from "~/lib/sync-engine";

const updaters = { root: db.tree.patchRoot };

type UpdaterKey = keyof typeof updaters;

export const action: ActionFunction = async ({ request, params }) => {
  if (params.treeId === undefined) return { errors: "Tree id required" };
  const transactions: Array<SyncItem> = await request.json();
  // @todo parallelize the updates
  // currently not possible because we fetch the entire tree
  // and parallelized updates will cause unpredictable side effects
  for await (const transaction of transactions) {
    for await (const change of transaction.changes) {
      const { namespace, patches } = change;
      if (namespace in updaters) {
        await updaters[namespace as UpdaterKey](params.treeId, patches);
      }
    }
  }
  return { status: "ok" };
};
