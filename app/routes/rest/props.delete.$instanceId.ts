import { type ActionFunction } from "remix";
import * as db from "~/shared/db";

export const action: ActionFunction = async ({ request, params }) => {
  if (params.instanceId === undefined) throw new Error("Instance id requred");
  const { propId } = await request.json();
  await db.props.deleteOne(params.instanceId, propId);
  return { status: "ok" };
};
