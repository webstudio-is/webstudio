import { useRouteError } from "@remix-run/react";
import { ClientOnly } from "../client-only";
import { lazy } from "react";
import { parseError } from "./error-parse";

const ErrorMessage = lazy(async () => {
  const { ErrorMessage } = await import("./error-message.client");
  return { default: ErrorMessage };
});

export const ErrorBoundary = () => {
  const rawError = useRouteError();

  const error = parseError(rawError);

  return (
    <ClientOnly>
      <ErrorMessage error={error} />
    </ClientOnly>
  );
};
