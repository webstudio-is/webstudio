import * as Sentry from "@sentry/browser";
import { Extras } from "@sentry/types";

import { BrowserTracing } from "@sentry/tracing";

export const initSentry = () =>
  Sentry.init({
    dsn: "https://e4b439185ee94fca9599b768a75d211e@o1298958.ingest.sentry.io/6530661",
    integrations: [new BrowserTracing()],
    tracesSampleRate: 1.0,
    environment:
      process.env.NODE_ENV === "development" ? "development" : "production",
  });

type SentryHelperProps = {
  message: string;
  extra?: Extras;
  skipLogging?: boolean;
};

export const sentryMessage = ({
  message,
  extra,
  skipLogging = false,
}: SentryHelperProps) => {
  Sentry.withScope((scope) => {
    if (extra) scope.setExtras(extra);
    Sentry.captureMessage(message);
  });

  if (skipLogging !== true) {
    // eslint-disable-next-line no-console
    console.log(message);
  }
};

export const sentryException = ({
  message,
  extra,
  skipLogging = false,
}: SentryHelperProps) => {
  Sentry.withScope((scope) => {
    if (extra) scope.setExtras(extra);
    Sentry.captureException(message);
  });

  if (skipLogging !== true) {
    // eslint-disable-next-line no-console
    console.error(message);
  }
};
