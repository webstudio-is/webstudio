import { type ActionFunction } from "remix";
import * as db from "~/shared/db";

export const action: ActionFunction = async ({ request, params }) => {
  if (params.treeId === undefined) throw new Error("Tree id requred");
  const change = await request.json();
  await db.tree.updateChildren(params.treeId, change);
  return { status: "ok" };
};
