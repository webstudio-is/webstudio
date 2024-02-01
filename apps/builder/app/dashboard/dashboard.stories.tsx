import type { ComponentStory } from "@storybook/react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Dashboard } from "./dashboard";
import type { UserPlanFeatures } from "~/shared/db/user-plan-features.server";

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
  allowResourceVariables: false,
  maxDomainsAllowedPerUser: 5,
};

export const Empty: ComponentStory<typeof Dashboard> = () => {
  const router = createRouter(
    <Dashboard
      user={user}
      projects={[]}
      projectTemplates={[]}
      userPlanFeatures={userPlanFeatures}
    />
  );
  return <RouterProvider router={router} />;
};

export const WithProjects: ComponentStory<typeof Dashboard> = () => {
  const projects = [
    {
      id: "0",
      createdAt: new Date().toString(),
      title: "My Project",
      domain: "domain.com",
      userId: null,
      isDeleted: false,
      isPublished: false,
      latestBuild: null,
      previewImageAsset: null,
    },
  ];
  const router = createRouter(
    <Dashboard
      user={user}
      projects={projects}
      projectTemplates={projects}
      userPlanFeatures={userPlanFeatures}
    />
  );
  return <RouterProvider router={router} />;
};
