import type { LoaderFunctionArgs } from "@remix-run/server-runtime";
import {
  ApiCompatibilityTarget,
  apiClientHeader,
  createApiCompatibilityPayload,
} from "@webstudio-is/trpc-interface/api-compatibility";

const getTarget = (request: Request) => {
  const client = ApiCompatibilityTarget.safeParse(
    request.headers.get(apiClientHeader)
  );
  if (client.success) {
    return client.data;
  }

  return "browser";
};

const createResponse = (request: Request) => {
  const payload = createApiCompatibilityPayload({
    reason: "apiRouteNotFound",
    target: getTarget(request),
  });

  return new Response(JSON.stringify({ success: false, error: payload }), {
    status: 426,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
};

export const loader = ({ request }: LoaderFunctionArgs) => {
  return createResponse(request);
};

export const action = loader;
