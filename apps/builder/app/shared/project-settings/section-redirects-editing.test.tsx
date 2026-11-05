import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import { userEvent } from "@vitest/browser/context";
import { expect, test } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import { $pages } from "~/shared/sync/data-stores";
import {
  $authPermit,
  $builderMode,
  $canOpenPageTemplates,
  $selectedPageId,
} from "~/shared/nano-states";
import { registerContainers } from "~/shared/sync/sync-stores";
import { SectionRedirects } from "./section-redirects";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
registerContainers();

test("deleting a redirect preserves unrelated legacy redirects", async () => {
  const previousPages = $pages.get();
  const previousPageId = $selectedPageId.get();
  const legacy = { old: "/legacy", new: "/blog/:slug", status: "301" } as const;
  $pages.set({
    homePageId: "home",
    rootFolderId: "root",
    folders: new Map([
      ["root", { id: "root", name: "", slug: "", children: ["home"] }],
    ]),
    pages: new Map([
      [
        "home",
        {
          id: "home",
          name: "Home",
          path: "",
          title: "",
          meta: {},
          rootInstanceId: "home-root",
        },
      ],
    ]),
    redirects: [legacy, { old: "/remove", new: "/target", status: "301" }],
  });
  $selectedPageId.set("home");
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    await act(async () =>
      root.render(
        <TooltipProvider>
          <SectionRedirects />
        </TooltipProvider>
      )
    );
    await act(async () =>
      userEvent.click(
        container.querySelector('[aria-label="Delete redirect from /remove"]')!
      )
    );
    expect(
      container.querySelector('[aria-label="Delete redirect from /remove"]')
    ).toBeNull();
    expect.soft($pages.get()?.redirects).toEqual([legacy]);
    act(() => root.render(<div />));
    await act(async () =>
      root.render(
        <TooltipProvider>
          <SectionRedirects />
        </TooltipProvider>
      )
    );
    expect(
      container.querySelector('[aria-label="Delete redirect from /remove"]')
    ).toBeNull();
  } finally {
    act(() => root.unmount());
    container.remove();
    $pages.set(previousPages);
    $selectedPageId.set(previousPageId);
  }
});

test("a declined mutation does not hide a saved redirect", async () => {
  const previousPages = $pages.get();
  const previousPageId = $selectedPageId.get();
  const previousPermit = $authPermit.get();
  const previousMode = $builderMode.get();
  const redirect = { old: "/keep", new: "/target", status: "301" } as const;
  $authPermit.set("edit");
  $builderMode.set("content");
  $pages.set({
    homePageId: "home",
    rootFolderId: "root",
    folders: new Map([
      ["root", { id: "root", name: "", slug: "", children: ["home"] }],
    ]),
    pages: new Map([
      [
        "home",
        {
          id: "home",
          name: "Home",
          path: "",
          title: "",
          meta: {},
          rootInstanceId: "home-root",
        },
      ],
    ]),
    pageTemplates: new Map([
      [
        "template",
        {
          id: "template",
          name: "Template",
          title: "",
          meta: {},
          rootInstanceId: "template-root",
        },
      ],
    ]),
    redirects: [redirect],
  });
  $selectedPageId.set("template");
  expect($canOpenPageTemplates.get()).toBe(false);
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    await act(async () =>
      root.render(
        <TooltipProvider>
          <SectionRedirects />
        </TooltipProvider>
      )
    );
    await act(async () =>
      userEvent.click(
        container.querySelector('[aria-label="Delete redirect from /keep"]')!
      )
    );
    expect($pages.get()?.redirects).toEqual([redirect]);
    expect(
      container.querySelector('[aria-label="Delete redirect from /keep"]')
    ).not.toBeNull();
  } finally {
    act(() => root.unmount());
    container.remove();
    $pages.set(previousPages);
    $selectedPageId.set(previousPageId);
    $authPermit.set(previousPermit);
    $builderMode.set(previousMode);
  }
});
