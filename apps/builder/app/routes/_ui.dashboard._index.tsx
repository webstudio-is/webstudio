import { lazy } from "react";
import { ClientOnly } from "~/shared/client-only";
export { ErrorBoundary } from "~/shared/error/error-boundary";

const Dashboard = lazy(async () => {
  const { Dashboard } = await import("~/dashboard/index.client");
  return { default: Dashboard };
});

const DashboardRoute = () => {
  return (
    <ClientOnly>
      <Dashboard />
    </ClientOnly>
  );
};

export default DashboardRoute;
