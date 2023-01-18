// Our root outlet doesn't contain a layout because we have 2 types of documents: canvas and designer and we need to decide down the line which one to render, thre is no single root document.
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { Outlet } from "@remix-run/react";
import { setEnv } from "@webstudio-is/feature-flags";
import { withSentryRouteTracing } from "@sentry/remix";
import { ErrorBoundary } from "@sentry/remix";
import { OutletProps } from "react-router-dom";
import env from "./shared/env";
import { PersistentFetcherProvider } from "./shared/fetcher";

setEnv(env.FEATURES as string);

const RootWithErrorBoundary = (props: OutletProps) => (
  <ErrorBoundary>
    <TooltipProvider>
      <PersistentFetcherProvider>
        <Outlet {...props} />
      </PersistentFetcherProvider>
    </TooltipProvider>
  </ErrorBoundary>
);

export default withSentryRouteTracing(
  // withSentryRouteTracing() expects a type from component that is not necessary true.
  RootWithErrorBoundary as () => JSX.Element
);
