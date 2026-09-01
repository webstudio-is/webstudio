import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { TooltipProvider } from "@webstudio-is/design-system";
import type { DashboardProject } from "@webstudio-is/dashboard";
import "@webstudio-is/design-system/colors.css";
import { ProjectCard } from "./project-card";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.documentElement.removeAttribute("data-color-scheme");
});

test.each(["light", "dark"] as const)(
  "uses the original fixed scrim treatment for project tags in %s mode",
  (mode) => {
    document.documentElement.dataset.colorScheme = mode;
    const project = {
      id: "project",
      createdAt: new Date().toISOString(),
      title: "Tagged project",
      domain: "tagged-project",
      userId: "user",
      isDeleted: false,
      isPublished: false,
      latestBuild: null,
      previewImageAsset: null,
      previewImageAssetId: null,
      latestBuildVirtual: null,
      marketplaceApprovalStatus: "UNLISTED",
      tags: ["production"],
      domainsVirtual: [],
      workspaceId: null,
    } as DashboardProject;

    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: (
            <TooltipProvider>
              <ProjectCard
                project={project}
                publisherHost="wstd.work"
                projectsTags={[{ id: "production", label: "Prod" }]}
              />
            </TooltipProvider>
          ),
        },
      ],
      { future: { v7_relativeSplatPath: true } }
    );
    act(() => {
      root.render(
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      );
    });

    const tag = Array.from(container.querySelectorAll<HTMLElement>("div")).find(
      (element) =>
        element.textContent === "#Prod" && element.childElementCount === 0
    );
    if (tag === undefined) {
      throw new Error("Expected the project tag");
    }
    const reference = document.createElement("span");
    reference.style.background = "oklch(0 0 0 / 0.3)";
    reference.style.color = "#fff";
    document.body.appendChild(reference);

    const tagStyle = getComputedStyle(tag);
    const referenceStyle = getComputedStyle(reference);
    const tagBackground = tagStyle.backgroundColor;
    const tagColor = tagStyle.color;
    const referenceBackground = referenceStyle.backgroundColor;
    const referenceColor = referenceStyle.color;
    reference.remove();
    expect(tagBackground).toBe(referenceBackground);
    expect(tagColor).toBe(referenceColor);
  }
);
