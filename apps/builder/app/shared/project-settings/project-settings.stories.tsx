import { useEffect, type JSX } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { StorySection } from "@webstudio-is/design-system";
import { ProjectSettingsDialog } from "./project-settings";
import { $pages, $project, $projectSettings } from "~/shared/sync/data-stores";
import type { Project } from "@webstudio-is/project";
import { $authPermit, $builderMode } from "~/shared/nano-states";

export default {
  title: "Project settings",
  component: ProjectSettingsDialog,
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
  const router = createRouter(
    <ProjectSettingsDialog currentSection="general" />
  );
  return (
    <StorySection title="General">
      <RouterProvider router={router} />
    </StorySection>
  );
};

const HeadersStory = ({ customized = false }: { customized?: boolean }) => {
  useEffect(() => {
    const previousSettings = $projectSettings.get();
    const previousPermit = $authPermit.get();
    const previousMode = $builderMode.get();
    $authPermit.set("own");
    $builderMode.set("design");
    $projectSettings.set({
      meta: customized
        ? {
            customHeaders: [
              {
                name: "Content-Security-Policy",
                value:
                  "frame-ancestors 'self' https://example.com https://another-example.com",
              },
              { name: "X-Frame-Options", value: "DENY" },
              {
                route: "/private/*",
                name: "Referrer-Policy",
                value: "no-referrer",
              },
            ],
          }
        : {},
      compiler: {},
    });
    return () => {
      $projectSettings.set(previousSettings);
      $authPermit.set(previousPermit);
      $builderMode.set(previousMode);
    };
  }, [customized]);
  const router = createRouter(
    <ProjectSettingsDialog currentSection="headers" />
  );
  return (
    <StorySection title="Headers">
      <RouterProvider router={router} />
    </StorySection>
  );
};

export const Headers = () => <HeadersStory customized />;
export const HeadersDefaults = () => <HeadersStory />;

export const Redirects = () => {
  $pages.set({
    homePageId: "pageId",
    rootFolderId: "root",
    pages: new Map([
      [
        "pageId",
        {
          id: "pageId",
          name: "My Name",
          path: "",
          title: `"My Title"`,
          meta: {},
          rootInstanceId: "body",
        },
      ],
    ]),
    folders: new Map([
      [
        "root",
        {
          id: "root",
          name: "",
          slug: "",
          children: ["pageId"],
        },
      ],
    ]),
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
    <ProjectSettingsDialog currentSection="redirects" />
  );
  return (
    <StorySection title="Redirects">
      <RouterProvider router={router} />
    </StorySection>
  );
};
