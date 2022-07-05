import { hydrate } from "react-dom";
import { RemixBrowser } from "@remix-run/react";
import { initSentry } from "./shared/sentry";

import { useLocation, useMatches } from "@remix-run/react";
import { BrowserTracing, remixRouterInstrumentation } from "@sentry/remix";
import { useEffect } from "react";

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

hydrate(<RemixBrowser />, document);
