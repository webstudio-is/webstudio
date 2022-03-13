import { type ActionFunction, json } from "remix";
import * as db from "~/shared/db";

export const action: ActionFunction = async ({ request, params }) => {
  if (params.treeId === undefined) return { errors: "Tree id required" };
  const instanceReparentingSpec = await request.json();
  await db.tree.reparent(params.treeId, instanceReparentingSpec);
  return { status: "ok" };
};
