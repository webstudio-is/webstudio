import { type ActionFunction } from "remix";
import * as db from "~/shared/db";

export const action: ActionFunction = async ({ request, params }) => {
  if (params.treeId === undefined) return { errors: "Tree id required" };
  const instanceInsertionSpec = await request.json();
  await db.tree.insert(params.treeId, instanceInsertionSpec);
  return { status: "ok" };
};
