import { json, type ActionFunctionArgs } from "@remix-run/server-runtime";
import { createDebug } from "~/shared/debug";
import { getAuthorizationServerOrigin } from "~/shared/router-utils/origins";
import { isBuilder, loginPath } from "~/shared/router-utils";
import { isRedirectResponse } from "~/services/cookie.server";
import {
  appendVaryHeader,
  createPrivateNoStoreHeaders,
} from "~/services/cache-control.server";

const debug = createDebug(import.meta.url);

const getCorsHeaders = (request: Request) => {
  const origin = request.headers.get("Origin");
  const allowedOrigin = getAuthorizationServerOrigin(request.url);

  if (origin !== allowedOrigin) {
    return;
  }

  return {
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Origin": origin,
  };
};

const withCors = (request: Request, response: Response) => {
  const corsHeaders = getCorsHeaders(request);
  if (corsHeaders === undefined) {
    return response;
  }

  const headers = createPrivateNoStoreHeaders(response.headers);
  for (const [name, value] of Object.entries(corsHeaders)) {
    headers.set(name, value);
  }
  appendVaryHeader(headers, "Origin");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

type BuilderLogout = (
  request: Request,
  options: { redirectTo: string }
) => Promise<unknown>;

export const createBuilderLogoutAction =
  (logout: BuilderLogout) =>
  async ({ request }: ActionFunctionArgs) => {
    // IMPORTANT: This route allows cross-origin cookies to enable dashboard logout from builders.
    // Enforcing preflight by checking Content-Type to be application/json.
    // Both the preflight and actual logout response must include CORS headers
    // or browser fetch reports the project logout as failed.

    if (false === isBuilder(request)) {
      throw new Response("Not found", {
        status: 404,
      });
    }

    if (request.method === "OPTIONS") {
      const corsHeaders = getCorsHeaders(request);
      if (corsHeaders === undefined) {
        return new Response("Origin not allowed", {
          status: 403,
        });
      }

      const headers = createPrivateNoStoreHeaders(corsHeaders);
      appendVaryHeader(headers, "Origin");

      return new Response(null, {
        status: 204,
        headers,
      });
    }

    if (request.method !== "POST") {
      return withCors(
        request,
        json(
          { message: "Method not allowed" },
          {
            status: 405,
          }
        )
      );
    }

    if (request.headers.get("sec-fetch-site") === "same-origin") {
      // To prevent logout initiated from the builder iframe

      return withCors(
        request,
        new Response("Only cross-origin requests are allowed", {
          status: 403,
        })
      );
    }

    if (
      false ===
      request.headers.get("Content-Type")?.includes("application/json")
    ) {
      // Enforce preflight request, preflight is checked on allowed origin

      return withCors(
        request,
        new Response("Invalid content type, only application/json is allowed", {
          status: 415,
        })
      );
    }

    const redirectTo = `${getAuthorizationServerOrigin(request.url)}${loginPath({})}`;

    try {
      debug("Logging out");

      await logout(request, {
        redirectTo,
      });
    } catch (error) {
      if (error instanceof Response) {
        if (isRedirectResponse(error)) {
          return withCors(
            request,
            new Response(null, {
              status: 204,
              headers: error.headers,
            })
          );
        }

        return withCors(request, error);
      }

      console.error(error);
      throw error;
    }

    throw new Response("Should not reach this point", {
      status: 500,
    });
  };
