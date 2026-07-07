import { json, type LoaderFunctionArgs } from "@remix-run/server-runtime";
import { createContext } from "~/shared/context.server";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { checkCsrf } from "~/services/csrf-session.server";
import { allowedDestinations } from "~/services/destinations.server";
import { privateNoStoreResponseHeaders } from "~/services/cache-control.server";
import { loadBuilderDataByProjectId } from "~/services/build-router.server";

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  preventCrossOriginCookie(request);
  allowedDestinations(request, ["document", "empty"]);
  await checkCsrf(request);

  if (params.projectId === undefined) {
    throw new Error("Project id undefined");
  }
  const context = await createContext(request);
  const data = await loadBuilderDataByProjectId(params.projectId, context);

  return json(data, { headers: privateNoStoreResponseHeaders });
};
