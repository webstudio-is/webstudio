import type { ActionArgs } from "@remix-run/node";
import { findAuthenticatedUser } from "~/services/auth.server";
import { projectRouter } from "@webstudio-is/project/server";

export const action = async ({ request, params }: ActionArgs) => {
  const authenticatedUser = await findAuthenticatedUser(request);
  if (authenticatedUser === null) {
    throw new Error("Not authenticated");
  }

  const { method } = params;

  if (method === undefined) {
    throw new Error("Missing method");
  }

  const data = Object.fromEntries(await request.formData()) as never;
  // @todo pass authorization context
  const caller = projectRouter.createCaller({ userId: authenticatedUser.id });

  const allowedProcedures = Object.keys(projectRouter["_def"].record);

  if (!allowedProcedures.includes(method)) {
    throw new Error(`Unknown RPC method "${method}"`);
  }

  const fn = caller[method as keyof typeof caller];

  if (typeof fn === "function") {
    return await fn(data);
  }

  throw new Error(`Unknown RPC method "${method}"`);
};
