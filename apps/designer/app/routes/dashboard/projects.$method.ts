import type { ActionArgs } from "@remix-run/node";
import { dashboardProjectRouter } from "@webstudio-is/dashboard/server";
import { findAuthenticatedUser } from "~/services/auth.server";
import { handleTrpcRemixAction } from "~/shared/remix/trpc-remix-request.server";

export const action = async ({ request, params }: ActionArgs) => {
  const authenticatedUser = await findAuthenticatedUser(request);
  if (authenticatedUser === null) {
    throw new Error("Not authenticated");
  }
  // @todo use createContext
  const context = {
    userId: authenticatedUser.id,
  };

  return await handleTrpcRemixAction({
    request,
    params,
    router: dashboardProjectRouter,
    context,
  });
};
