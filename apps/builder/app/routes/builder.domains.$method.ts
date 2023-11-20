import type { ActionArgs } from "@remix-run/node";
import { domainRouter } from "@webstudio-is/domain/index.server";
import { createContext } from "~/shared/context.server";
import { handleTrpcRemixAction } from "~/shared/remix/trpc-remix-request.server";

export const action = async ({ request, params }: ActionArgs) => {
  const context = await createContext(request);

  return await handleTrpcRemixAction({
    request,
    params,
    router: domainRouter,
    context,
  });
};

export const loader = action;
