import type { ActionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { findAuthenticatedUser } from "~/services/auth.server";
import { designerPath } from "~/shared/router-utils";
import { db } from "@webstudio-is/project/server";
import { zfd } from "zod-form-data";

const Data = zfd.formData({
  title: zfd.text(),
});

export const action = async ({ request }: ActionArgs) => {
  const { title } = Data.parse(await request.formData());

  const authenticatedUser = await findAuthenticatedUser(request);

  if (authenticatedUser === null) {
    throw new Error("Not authenticated");
  }

  const project = await db.project.create({
    title,
    userId: authenticatedUser.id,
  });

  if ("errors" in project) {
    return project;
  }

  return redirect(designerPath({ projectId: project.id }));
};
