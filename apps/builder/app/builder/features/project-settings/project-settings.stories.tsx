import type { JSX } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ProjectSettingsView } from "./project-settings";
import { $pages, $project } from "~/shared/nano-states";
import type { Project } from "@webstudio-is/project";

export default {
  component: ProjectSettingsView,
};

const createRouter = (element: JSX.Element) =>
  createBrowserRouter([
    {
      path: "*",
      element,
      loader: () => null,
    },
  ]);

$project.set({ id: "projectId" } as Project);

export const General = () => {
  const router = createRouter(<ProjectSettingsView currentSection="general" />);
  return <RouterProvider router={router} />;
};

export const Redirects = () => {
  $pages.set({
    homePage: {
      id: "pageId",
      name: "My Name",
      path: "",
      title: `"My Title"`,
      meta: {},
      rootInstanceId: "body",
    },
    pages: [],
    folders: [],
    redirects: [
      { old: "/old", new: "/new" },
      { old: "/old", new: "https://google.com" },
      {
        old: "/oldddddddddddd/ddddddddddd/dddddddd/dddddd",
        new: "https://gooooooooooooooooooooooooooooooooooooogle.com",
        status: "302",
      },
    ],
  });

  const router = createRouter(
    <ProjectSettingsView currentSection="redirects" />
  );
  return <RouterProvider router={router} />;
};
