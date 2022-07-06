import * as Sentry from "@sentry/remix";
import { Extras, Integration } from "@sentry/types";
import env from "apps/designer/app/shared/env";

export const initSentry = ({
  integrations = [],
}: { integrations?: Integration[] } = {}) =>
  env.SENTRY_DSN
    ? Sentry.init({
        dsn: env.SENTRY_DSN,
        tracesSampleRate: 1.0,
        environment: env.VERCEL_ENV || "development",
        integrations: integrations,
      })
    : () => null;

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
  if (env.SENTRY_DSN) {
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
  if (env.SENTRY_DSN) {
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
