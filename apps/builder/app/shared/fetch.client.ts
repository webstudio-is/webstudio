import { toast } from "@webstudio-is/design-system";
import { csrfToken } from "./csrf.client";
import { $authToken } from "./nano-states";

/**
 * To avoid fetch interception from the canvas, i.e., `globalThis.fetch = () => console.log('INTERCEPTED');`,
 */
const _fetch = globalThis.fetch;

/**
 * To avoid fetch interception from the canvas, i.e., `globalThis.fetch = () => console.log('INTERCEPTED');`,
 * To add csrf token to the headers.
 */
export const fetch: typeof globalThis.fetch = (requestInfo, requestInit) => {
  if (csrfToken === undefined) {
    toast.error("CSRF token is not set.");
    throw new Error("CSRF token is not set.");
  }

  const headers = new Headers(requestInit?.headers);

  headers.set("X-CSRF-Token", csrfToken);

  const authToken = $authToken.get();

  // Do not override the existing x-auth-token header.
  // As some mutations are queue based and they need to be authenticated with the same token as in the queue.
  if (authToken !== undefined && headers.get("x-auth-token") === null) {
    headers.set("x-auth-token", authToken);
  }

  const modifiedInit: RequestInit = {
    ...requestInit,
    headers,
  };

  return _fetch(requestInfo, modifiedInit);
};
