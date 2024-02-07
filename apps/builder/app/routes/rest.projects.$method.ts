import type { ActionArgs } from "@remix-run/node";
import { projectRouter } from "@webstudio-is/project/index.server";
import { findAuthenticatedUser } from "~/services/auth.server";
import { createContext } from "~/shared/context.server";
import { handleTrpcRemixAction } from "~/shared/remix/trpc-remix-request.server";

export const action = async ({ request, params }: ActionArgs) => {
  const authenticatedUser = await findAuthenticatedUser(request);
  if (authenticatedUser === null) {
    throw new Error("Not authenticated");
  }

  const context = await createContext(request);

  return await handleTrpcRemixAction({
    request,
    params,
    router: projectRouter,
    context,
  });
};
