import { redirect as remixRedirect } from "@remix-run/server-runtime";
import { isRedirectResponse } from "./cookie.server";

/**
 * Chrome aggressively uses cache when restoring tabs (e.g., using Shift+Command+T or automatic session restore).
 * This behavior can cause issues with loading a builder application due to the following cycle:
 *
 * 1. The builder checks if the session needs to be renewed (a navigation is detected) and redirects to `/auth/ws`.
 * 2. Chrome retrieves the `/auth/ws` response from the cache, followed by all OAuth redirect responses from the cache.
 * 3. The last cached response redirects back to the builder's root (`/`). Chrome detects this as a redirect cycle
 *    and reloads the most recent OAuth step, resulting in an "expected state" error.
 * 4. To prevent this issue, the only solution is to add a `no-store` directive to all redirect responses.
 */
export const redirect: typeof remixRedirect = (url, init) => {
  const headers =
    typeof init === "object" ? new Headers(init.headers) : new Headers();
  headers.set("Cache-Control", "no-store");

  const responseInit: ResponseInit =
    typeof init === "number" ? { status: init, headers } : { ...init, headers };

  return remixRedirect(url, responseInit);
};

/**
 * Chrome aggressively uses cache when restoring tabs (e.g., using Shift+Command+T or automatic session restore).
 * This behavior can cause issues with loading a builder application due to the following cycle:
 *
 * 1. The builder checks if the session needs to be renewed (a navigation is detected) and redirects to `/auth/ws`.
 * 2. Chrome retrieves the `/auth/ws` response from the cache, followed by all OAuth redirect responses from the cache.
 * 3. The last cached response redirects back to the builder's root (`/`). Chrome detects this as a redirect cycle
 *    and reloads the most recent OAuth step, resulting in an "expected state" error.
 * 4. To prevent this issue, the only solution is to add a `no-store` directive to all redirect responses.
 */
export const setNoStoreToRedirect = (response: Response) => {
  if (isRedirectResponse(response)) {
    const newResponse = new Response(response.body, response);
    newResponse.headers.set("Cache-Control", "no-store");
    return newResponse;
  }

  return response;
};
