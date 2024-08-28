import { createCookieSessionStorage } from "@remix-run/node";
import env from "~/env/env.server";
import { getSessionCookieNameVersion } from "./auth.server.utils";

export const builderSessionStorage = createCookieSessionStorage({
  cookie: {
    // Using the __Host- prefix to prevent a malicious user from setting another person's session cookie
    // on all subdomains of apps.webstudio.is, e.g., setting Domain=.apps.webstudio.is.
    // For more information, see: https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/Cookies#name
    name: `__Host-_session_builder_session_${getSessionCookieNameVersion()}`,
    sameSite: "lax",
    path: "/",
    httpOnly: true,
    secrets: env.AUTH_SECRET ? [env.AUTH_SECRET] : undefined,
    secure: true,
  },
});
