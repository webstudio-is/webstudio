import type { ComponentStory } from "@storybook/react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Dashboard } from "./dashboard";

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

export const Empty: ComponentStory<typeof Dashboard> = () => {
  const router = createRouter(<Dashboard user={user} projects={[]} />);
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
    },
  ];
  const router = createRouter(<Dashboard user={user} projects={projects} />);
  return <RouterProvider router={router} />;
};
