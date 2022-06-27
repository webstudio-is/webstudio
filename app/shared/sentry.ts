import * as Sentry from "@sentry/browser";
import { Extras } from "@sentry/types";
import { BrowserTracing } from "@sentry/tracing";
import env from "~/shared/env";

const SENTRY_DSN =
  typeof window !== "undefined" ? env.SENTRY_DSN : process.env.SENTRY_DSN;
const VERCEL_ENV =
  typeof window !== "undefined" ? env.VERCEL_ENV : process.env.VERCEL_ENV;
export const initSentry = () => {
  SENTRY_DSN
    ? Sentry.init({
        dsn: SENTRY_DSN,
        integrations: [new BrowserTracing()],
        tracesSampleRate: 1.0,
        environment: VERCEL_ENV || "development",
      })
    : () => null;
};
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
  if (SENTRY_DSN) {
    Sentry.withScope((scope) => {
      if (extra) scope.setExtras(extra);
      Sentry.captureMessage(message);
    });
  }

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
  if (SENTRY_DSN) {
    Sentry.withScope((scope) => {
      if (extra) scope.setExtras(extra);
      Sentry.captureException(message);
    });
  }
  if (skipLogging !== true) {
    // eslint-disable-next-line no-console
    console.error(message);
  }
};
