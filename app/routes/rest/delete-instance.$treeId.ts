import { type ActionFunction, json } from "remix";
import * as db from "~/shared/db";

export const action: ActionFunction = async ({ request, params }) => {
  if (params.treeId === undefined) return { errors: "Tree id required" };
  const deleteSpec = await request.json();
  await db.tree.deleteInstance(params.treeId, deleteSpec.instanceId);
  return { status: "ok" };
};
