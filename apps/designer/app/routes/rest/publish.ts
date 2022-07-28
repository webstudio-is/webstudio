import { type ActionFunction } from "@remix-run/node";
import { zfd } from "zod-form-data";
import * as db from "~/shared/db";

const schema = zfd.formData({
  domain: zfd.text(),
  projectId: zfd.text(),
});

export const action: ActionFunction = async ({ request }) => {
  const { domain, projectId } = schema.parse(await request.formData());
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
