import type { ActionArgs } from "@remix-run/node";
import { findAuthenticatedUser } from "~/services/auth.server";
import { projectRouter } from "@webstudio-is/project/server";

export const action = async ({ request, params }: ActionArgs) => {
  const authenticatedUser = await findAuthenticatedUser(request);
  if (authenticatedUser === null) {
    throw new Error("Not authenticated");
  }
  const data = Object.fromEntries(await request.formData()) as never;
  // @todo pass authorization context
  const caller = projectRouter.createCaller({ userId: authenticatedUser.id });
  return await caller[params.method as keyof typeof caller](data);
};
