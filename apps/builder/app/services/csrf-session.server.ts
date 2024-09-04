import { createCookieSessionStorage } from "@remix-run/node";
import env from "~/env/env.server";
import { extractAuthFromRequest } from "~/shared/context.server";
import { allowedDestinations } from "./destinations.server";

type CsrfSessionData = {
  hash: string;
  token: string;
};

const getCsrfSessionCookieNameVersion = () => {
  // IMPORTANT: If you see an error here, you need to increase the version number.
  // Explanation:
  // Changing the CsrfSessionData type will cause all existing user sessions to not work as expected.
  // There is no logic to validate or clean up sessions, so we avoid session migration issues by changing the session cookie name.
  // This ensures that old sessions are invalidated and new sessions are created with the updated structure.
  const obj: CsrfSessionData = { token: "", hash: "" };
  obj.hash = "";

  // IMPORTANT: Change version in the SaaS platform as well!
  // IMPORTANT: Changing the version will cause all users to be logged out.
  return "1";
};

const csrfSessionStorage = createCookieSessionStorage({
  cookie: {
    // Using the __Host- prefix to prevent a malicious user from setting another person's session cookie
    // on all subdomains of apps.webstudio.is, e.g., setting Domain=.apps.webstudio.is.
    // For more information, see: https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/Cookies#name
    name: `__Host-_csrf_${getCsrfSessionCookieNameVersion()}`,
    sameSite: "lax",
    path: "/",
    httpOnly: true,
    secrets: env.AUTH_WS_CLIENT_SECRET
      ? [env.AUTH_WS_CLIENT_SECRET]
      : undefined,
    secure: true,
  },
});

const toBase64Url = (buffer: ArrayBuffer) => {
  return Buffer.from(buffer).toString("base64url");
};

export const getRequestAuthHash = async (request: Request) => {
  const data = await extractAuthFromRequest(request);

  if (data.isServiceCall) {
    throw new Error("Service calls are not allowed to use CSRF tokens.");
  }

  // Because of cookie session we don't have session id in the request, so we derive it from the auth credentials data.
  const sessionId = data.authToken ?? data.sessionData?.userId ?? "anonymous";

  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(sessionId);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  return toBase64Url(hashBuffer.slice(0, 16));
};

/**
 * We use a hash to ensure that any change in authentication credentials also changes the CSRF token.
 *
 * If setCookieValue is defined, it means that we need to set the cookie.
 */
export const getCsrfTokenAndCookie = async (
  request: Request
): Promise<[csrfToken: string, setCookieValue: string | undefined]> => {
  const hash = await getRequestAuthHash(request);

  const csrfSession = await csrfSessionStorage.getSession(
    request.headers.get("Cookie")
  );

  let sessionCreateCookieValue: string | undefined = undefined;

  if (csrfSession.get("hash") !== hash) {
    const csrfTokenLength = 16;
    const array = new Uint8Array(csrfTokenLength);
    crypto.getRandomValues(array);
    const token = toBase64Url(array);

    csrfSession.set("hash", hash);
    csrfSession.set("token", token);
    sessionCreateCookieValue =
      await csrfSessionStorage.commitSession(csrfSession);
  }

  return [csrfSession.get("token"), sessionCreateCookieValue];
};

export const checkCsrf = async (request: Request) => {
  if (
    request.headers.get("sec-fetch-mode") === "navigate" &&
    request.method === "GET"
  ) {
    // Do not check CSRF for GET navigation requests to allow logged-in users to view the data.
    // However, prevent loading the data from an iframe.
    allowedDestinations(request, ["document"]);
    return;
  }

  const [token, setCookieValue] = await getCsrfTokenAndCookie(request);

  if (setCookieValue) {
    throw new Response(
      "Authentication credentials have changed. Please reload and try again.",
      {
        status: 403,
        statusText:
          "Authentication credentials have changed. Please reload and try again.",
      }
    );
  }

  const csrfToken = request.headers.get("X-CSRF-Token");

  if (token !== csrfToken) {
    throw new Response(
      `Forbidden: "The CSRF token is invalid. Please reload and try again.`,
      {
        status: 403,
        statusText: `Forbidden: "The CSRF token is invalid. Please reload and try again.`,
      }
    );
  }
};
