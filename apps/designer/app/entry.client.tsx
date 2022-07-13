import { hydrate } from "react-dom";
import { RemixBrowser } from "@remix-run/react";
import { initSentry } from "./shared/sentry";

import { useLocation, useMatches } from "@remix-run/react";
import { BrowserTracing, remixRouterInstrumentation } from "@sentry/remix";
import { useEffect } from "react";
import env from "./shared/env";

initSentry({
  integrations: [
    new BrowserTracing({
      routingInstrumentation: remixRouterInstrumentation(
        useEffect,
        useLocation,
        useMatches
      ),
    }),
  ],
});

// Forward DEBUG env variable defined on the server to the client-side debug() utility.
// This way you can set it once server-side and have the logging or feature flags enabled on both, server and client
if (
  typeof localStorage !== "undefined" &&
  // Client-side value should override the server-side one
  (localStorage.debug == null || localStorage.debug === "")
) {
  localStorage.debug = env.DEBUG;
}

hydrate(<RemixBrowser />, document);
