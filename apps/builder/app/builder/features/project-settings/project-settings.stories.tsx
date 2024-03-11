import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { $isProjectSettingsOpen } from "~/shared/nano-states/seo";
import { ProjectSettingsView } from "./project-settings";
import { $pages } from "~/shared/nano-states";

export default {
  component: ProjectSettingsView,
};

$isProjectSettingsOpen.set(true);
const createRouter = (element: JSX.Element) =>
  createBrowserRouter([
    {
      path: "*",
      element,
      loader: () => null,
    },
  ]);

export const General = () => {
  const router = createRouter(
    <ProjectSettingsView currentSection="General" isOpen />
  );
  return <RouterProvider router={router} />;
};

export const Redirects = () => {
  $pages.set({
    homePage: {
      id: "pageId",
      name: "My Name",
      path: "/",
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
    <ProjectSettingsView currentSection="Redirects" isOpen />
  );
  return <RouterProvider router={router} />;
};
