import { type ActionFunction } from "remix";
import * as db from "~/shared/db";

export const action: ActionFunction = async ({ request }) => {
  const data = await request.json();
  await db.props.deleteProp(data);
  return { status: "ok" };
};
