import { lazy } from "react";
import { type MetaFunction } from "@remix-run/react";
import { ClientOnly } from "~/shared/client-only";
export { ErrorBoundary } from "~/shared/error/error-boundary";

export const meta = () => {
  const metas: ReturnType<MetaFunction> = [];

  metas.push({ title: "Webstudio Dashboard | Search" });

  return metas;
};

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
