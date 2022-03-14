import { type ActionFunction } from "remix";
import * as db from "~/shared/db";

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const domain = formData.get("domain") as string | null;
  const projectId = formData.get("projectId") as string | null;
  try {
    const project = await db.misc.publish({ projectId, domain });
    return { domain: project.domain };
  } catch (error) {
    if (error instanceof Error) {
      return {
        errors: error.message,
      };
    }
  }
  return { errors: "Unexpected error" };
};
