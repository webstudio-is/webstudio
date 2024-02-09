import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { $isProjectSettingsOpen } from "~/shared/nano-states/seo";
import { ProjectSettings } from "./project-settings";

export default {
  component: ProjectSettings,
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

export const ProjectSettingsExample = () => {
  const router = createRouter(<ProjectSettings />);
  return <RouterProvider router={router} />;
};
