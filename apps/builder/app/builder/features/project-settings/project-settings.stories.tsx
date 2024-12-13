import type { JSX } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ProjectSettingsView } from "./project-settings";
import { $pages } from "~/shared/nano-states";

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
      systemDataSourceId: "",
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
