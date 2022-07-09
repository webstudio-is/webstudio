// Our root outlet doesn't contain a layout because we have 2 types of documents: canvas and designer and we need to decide down the line which one to render, thre is no single root document.
import { Outlet } from "@remix-run/react";
import { withSentryRouteTracing } from "@sentry/remix";
import { ErrorBoundary } from "@sentry/remix";
import { OutletProps } from "react-router-dom";

const RootWithErrorBoundary = (props: OutletProps) => (
  // @ts-expect-error 'ErrorBoundary' cannot be used as a JSX component.
  <ErrorBoundary>
    <Outlet {...props} />
  </ErrorBoundary>
);

export default withSentryRouteTracing(
  // withSentryRouteTracing() expects a type from component that is not necessary true.
  RootWithErrorBoundary as () => JSX.Element
);
