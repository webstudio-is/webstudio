import * as Sentry from "@sentry/remix";
import { Extras, Integration } from "@sentry/types";
import env from "~/shared/env";

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
  extras?: Extras;
  skipLogging?: boolean;
};

export const sentryMessage = ({
  message,
  extras,
  skipLogging = false,
}: SentryHelperProps & { message: string }) => {
  if (env.SENTRY_DSN) {
    Sentry.withScope((scope) => {
      if (extras) {
        scope.setExtras(extras);
      }
      Sentry.captureMessage(message);
    });
  }

  if (skipLogging !== true) {
    // eslint-disable-next-line no-console
    console.log(message);
  }
};

export const sentryException = ({
  error,
  extras,
  skipLogging = false,
}: SentryHelperProps & { error: unknown }) => {
  if (env.SENTRY_DSN) {
    Sentry.withScope((scope) => {
      if (extras) {
        scope.setExtras(extras);
      }
      Sentry.captureException(error);
    });
  }
  if (skipLogging !== true) {
    // eslint-disable-next-line no-console
    console.error(error);
  }
};
