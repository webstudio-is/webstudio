import { type ActionFunction } from "remix";
import * as db from "~/shared/db";

export const action: ActionFunction = async ({ request }) => {
  // @todo types
  const update = await request.json();
  await db.props.update(update);
  return { status: "ok" };
};
