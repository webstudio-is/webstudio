import { hydrate } from "react-dom";
import { RemixBrowser } from "@remix-run/react";
import * as Sentry from "@sentry/browser";
import { BrowserTracing } from "@sentry/tracing";

Sentry.init({
  dsn: "https://e4b439185ee94fca9599b768a75d211e@o1298958.ingest.sentry.io/6530661",
  integrations: [new BrowserTracing()],
  tracesSampleRate: 1.0,
});

hydrate(<RemixBrowser />, document);
