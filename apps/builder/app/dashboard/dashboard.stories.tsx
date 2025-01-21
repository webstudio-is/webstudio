import type { StoryFn } from "@storybook/react";
import type { JSX } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Dashboard } from "./dashboard";
import type { UserPlanFeatures } from "~/shared/db/user-plan-features.server";
import type { DashboardProject } from "@webstudio-is/dashboard";

export default {
  title: "Dashboard / Projects",
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

const createRouter = (element: JSX.Element) =>
  createBrowserRouter([
    {
      path: "*",
      element,
      loader: () => null,
    },
  ]);

const userPlanFeatures: UserPlanFeatures = {
  hasProPlan: false,
  hasSubscription: false,
  allowShareAdminLinks: false,
  allowDynamicData: false,
  maxContactEmails: 0,
  maxDomainsAllowedPerUser: 1,
};

export const WithProjects: StoryFn<typeof Dashboard> = () => {
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
  const router = createRouter(
    <Dashboard
      user={user}
      welcome={false}
      projects={projects}
      userPlanFeatures={userPlanFeatures}
      publisherHost={"https://wstd.work"}
    />
  );
  return <RouterProvider router={router} />;
};

export const WithTemplates: StoryFn<typeof Dashboard> = () => {
  const templates = [
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
  const router = createRouter(
    <Dashboard
      user={user}
      templates={templates}
      welcome
      userPlanFeatures={userPlanFeatures}
      publisherHost={"https://wstd.work"}
    />
  );
  return <RouterProvider router={router} />;
};
