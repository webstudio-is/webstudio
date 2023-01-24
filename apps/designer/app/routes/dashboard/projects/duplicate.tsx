import type { ActionArgs } from "@remix-run/node";
import { findAuthenticatedUser } from "~/services/auth.server";
import { db } from "@webstudio-is/project/server";
import { zfd } from "zod-form-data";

const Data = zfd.formData({
  projectId: zfd.text(),
});

export const action = async ({ request }: ActionArgs) => {
  const { projectId } = Data.parse(await request.formData());

  const authenticatedUser = await findAuthenticatedUser(request);

  if (authenticatedUser === null) {
    throw new Error("Not authenticated");
  }

  const result = await db.project.duplicate(projectId);
  return result;
};
