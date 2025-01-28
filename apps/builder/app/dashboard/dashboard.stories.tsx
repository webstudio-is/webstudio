import type { StoryFn } from "@storybook/react";
import type { JSX } from "react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { Dashboard, DashboardSetup } from "./dashboard";
import type { UserPlanFeatures } from "~/shared/db/user-plan-features.server";
import type { DashboardProject } from "@webstudio-is/dashboard";

export default {
  title: "Dashboard",
  component: Dashboard,
};

const user = {
  id: "0",
  createdAt: new Date().toString(),
  email: null,
  image: null,
  username: "Taylor",
  teamId: null,
  provider: "github",
};

const createRouter = (element: JSX.Element, path: string, current?: string) =>
  createMemoryRouter([{ path, element }], {
    initialEntries: [current ?? path],
  });

const userPlanFeatures: UserPlanFeatures = {
  hasProPlan: false,
  hasSubscription: false,
  allowShareAdminLinks: false,
  allowDynamicData: false,
  maxContactEmails: 0,
  maxDomainsAllowedPerUser: 1,
};

const projects = [
  {
    id: "0",
    createdAt: new Date().toString(),
    title: "My Project",
    domain: "domain.com",
    userId: "",
    isDeleted: false,
    isPublished: false,
    latestBuild: null,
    previewImageAsset: null,
    previewImageAssetId: "",
    latestBuildVirtual: null,
    marketplaceApprovalStatus: "UNLISTED" as const,
  } as DashboardProject,
];

const data = {
  user,
  templates: projects,
  userPlanFeatures,
  publisherHost: "https://wstd.work",
  projects,
};

export const Welcome: StoryFn<typeof Dashboard> = () => {
  const router = createRouter(
    <>
      <DashboardSetup data={{ ...data, projects: [] }} />
      <Dashboard />
    </>,
    "/dashboard/templates"
  );
  return <RouterProvider router={router} />;
};

export const Projects: StoryFn<typeof Dashboard> = () => {
  const router = createRouter(
    <>
      <DashboardSetup data={data} />
      <Dashboard />
    </>,
    "/dashboard"
  );
  return <RouterProvider router={router} />;
};

export const Templates: StoryFn<typeof Dashboard> = () => {
  const router = createRouter(
    <>
      <DashboardSetup data={data} />
      <Dashboard />
    </>,
    "/dashboard/templates"
  );
  return <RouterProvider router={router} />;
};

export const Search: StoryFn<typeof Dashboard> = () => {
  const router = createRouter(
    <>
      <DashboardSetup data={data} />
      <Dashboard />
    </>,
    "/dashboard/search",
    "/dashboard/search?q=my"
  );

  return <RouterProvider router={router} />;
};

export const SearchNothingFound: StoryFn<typeof Dashboard> = () => {
  const router = createRouter(
    <>
      <DashboardSetup data={data} />
      <Dashboard />
    </>,
    "/dashboard/search",
    "/dashboard/search?q=notfound"
  );
  return <RouterProvider router={router} />;
};
