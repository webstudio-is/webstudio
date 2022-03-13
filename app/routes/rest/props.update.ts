import { type ActionFunction } from "remix";
import * as db from "~/shared/db";

export const action: ActionFunction = async ({ request, params }) => {
  const { instanceId, treeId, updates } = await request.json();
  await db.props.update(instanceId, treeId, updates);
  return { status: "ok" };
};
