import { toast } from "@webstudio-is/design-system";
import {
  apiClientHeader,
  apiClientVersionHeader,
  getApiCompatibilityPayload,
} from "@webstudio-is/trpc-interface/api-compatibility";
import { csrfToken } from "./csrf.client";
import { $authToken } from "./nano-states/misc";
import { publicStaticEnv } from "~/env/env.static";

/**
 * To avoid fetch interception from the canvas, i.e., `globalThis.fetch = () => console.log('INTERCEPTED');`,
 */
const _fetch = globalThis.fetch;

/** Apply the Builder request headers to both fetch and Form uploads. */
export const getBuilderRequestHeaders = (initial?: HeadersInit) => {
  if (csrfToken === undefined) {
    toast.error("CSRF token is not set.");
    throw new Error("CSRF token is not set.");
  }

  const headers = new Headers(initial);

  headers.set("X-CSRF-Token", csrfToken);
  headers.set(apiClientHeader, "browser");
  headers.set(apiClientVersionHeader, publicStaticEnv.VERSION);

  const authToken = $authToken.get();

  // Do not override the existing x-auth-token header.
  // As some mutations are queue based and they need to be authenticated with the same token as in the queue.
  if (authToken !== undefined && headers.get("x-auth-token") === null) {
    headers.set("x-auth-token", authToken);
  }

  return headers;
};

export const inspectBuilderResponse = async (response: Response) => {
  if (response.ok === false) {
    const contentType = response.headers.get("Content-Type") ?? "";
    if (contentType.includes("application/json")) {
      const body: unknown = await response
        .clone()
        .json()
        .catch(() => undefined);
      const payload = getApiCompatibilityPayload(body);
      if (payload?.action.type === "reloadBrowser") {
        toast.error(payload.message, {
          id: "api-compatibility",
          duration: Number.POSITIVE_INFINITY,
        });
        throw new Error(payload.message, { cause: payload });
      }
    }
  }
};

export const fetch: typeof globalThis.fetch = async (
  requestInfo,
  requestInit
) => {
  const headers = getBuilderRequestHeaders(requestInit?.headers);

  const modifiedInit: RequestInit = {
    ...requestInit,
    cache: requestInit?.cache ?? "no-store",
    headers,
  };

  const response = await _fetch(requestInfo, modifiedInit);
  await inspectBuilderResponse(response);

  return response;
};
