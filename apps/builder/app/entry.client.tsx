import { RemixBrowser, useLocation, useMatches } from "@remix-run/react";
import { startTransition, StrictMode, useEffect } from "react";
import { hydrateRoot } from "react-dom/client";
import { BrowserTracing, remixRouterInstrumentation } from "@sentry/remix";
import { initSentry } from "./shared/sentry";
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
// https://github.com/debug-js/debug#browser-support
try {
  if (
    // Client-side value should override the server-side one
    localStorage.debug == null ||
    localStorage.debug === ""
  ) {
    localStorage.debug = env.DEBUG;
  }
} catch (error) {
  // eslint-disable-next-line no-console
  console.warn("Failed to set localStorage.debug due to Error:", error);
}

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <RemixBrowser />
    </StrictMode>
  );
});
