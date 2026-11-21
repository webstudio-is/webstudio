import { useStore } from "@nanostores/react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { expect, test } from "vitest";
import type { Project } from "@webstudio-is/project";
import { createDefaultPages } from "@webstudio-is/project-build";
import { renderData, ws } from "@webstudio-is/template";
import {
  $authToken,
  $builderMode,
  $isPreviewMode,
  $pageNavigation,
  $selectedInstanceSelector,
  $selectedPageHash,
  $selectedPageId,
  requestPageNavigation,
  selectInstance,
  selectPage,
} from "~/shared/nano-states";
import {
  $activeInspectorPanel,
  $variablesSectionRequested,
  openBuilderView,
} from "~/builder/shared/nano-states";
import { $instances, $pages, $project } from "~/shared/sync/data-stores";
import { PreviewNavigationObserver, useSyncPageUrl } from "./use-switch-page";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const withRouter = async (
  check: (controls: {
    request: (hash?: string) => Promise<string>;
    back: () => Promise<void>;
    block: (blocked?: boolean) => void;
    commits: Array<() => void>;
    router: ReturnType<typeof createBrowserRouter>;
  }) => Promise<void>,
  mode: "design" | "preview" = "preview",
  initialPath = mode === "preview" ? "/?mode=preview" : "/"
) => {
  const savedUrl = window.location.href;
  const savedState = history.state;
  const stores = [
    $pages,
    $instances,
    $project,
    $authToken,
    $builderMode,
    $pageNavigation,
    $selectedPageHash,
    $selectedPageId,
    $activeInspectorPanel,
    $variablesSectionRequested,
  ];
  const saved = stores.map((store) => store.get());
  const savedSelection = $selectedInstanceSelector.get();
  history.replaceState({}, "", initialPath);
  const pages = createDefaultPages({
    homePageId: "home",
    rootInstanceId: "home-root",
  });
  pages.pages.set("other", {
    id: "other",
    name: "Other",
    path: "/other",
    title: "",
    meta: {},
    rootInstanceId: "other-root",
  });
  pages.folders.get(pages.rootFolderId)!.children.push("other");
  $pages.set(pages);
  $instances.set(
    renderData(
      <>
        <ws.element ws:tag="body" ws:id="home-root" />
        <ws.element ws:tag="body" ws:id="other-root">
          <ws.element ws:tag="section" ws:id="other-section" />
        </ws.element>
      </>
    ).instances
  );
  $project.set({ id: "090e6e14-ae50-4b2e-bd22-71733cec05bb" } as Project);
  $authToken.set(undefined);
  $selectedPageId.set("home");
  $builderMode.set(mode);
  $activeInspectorPanel.set("style");
  $variablesSectionRequested.set(false);
  $pageNavigation.set(undefined);
  const commits: Array<() => void> = [];
  let blocked = false;
  const App = () => {
    useSyncPageUrl({ isDataLoaded: true, onView: openBuilderView });
    const preview = useStore($isPreviewMode);
    return preview && <PreviewNavigationObserver />;
  };
  const router = createBrowserRouter([
    {
      path: "*",
      element: <App />,
      loader: () =>
        blocked
          ? new Promise<null>((resolve) => commits.push(() => resolve(null)))
          : null,
      shouldRevalidate: () => true,
    },
  ]);
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<RouterProvider router={router} />));
    await expect.poll(() => $pageNavigation.get()?.location?.key).toBeDefined();
    const request = async (hash = "#target") => {
      await act(async () => requestPageNavigation({ pageId: "home", hash }));
      return $pageNavigation.get()!.id;
    };
    const back = async () => {
      blocked = false;
      await act(async () => {
        await new Promise<void>((resolve) => {
          window.addEventListener("popstate", () => resolve(), { once: true });
          history.back();
        });
      });
    };
    await check({
      request,
      back,
      block: (next = true) => {
        blocked = next;
      },
      commits,
      router,
    });
  } finally {
    await act(async () => root.unmount());
    router.dispose();
    container.remove();
    history.replaceState(savedState, "", savedUrl);
    stores.forEach((store, index) => store.set(saved[index] as never));
    selectInstance(savedSelection);
  }
};

test("a Settings URL keeps the view when its page path becomes a page ID", async () => {
  const historyLength = history.length;
  await withRouter(
    async () => {
      const params = new URLSearchParams(window.location.search);
      expect(params.get("view")).toBe("settings");
      expect(params.get("pageId")).toBe("other");
      expect($selectedInstanceSelector.get()).toEqual([
        "other-section",
        "other-root",
      ]);
      expect($activeInspectorPanel.get()).toBe("settings");
      expect($variablesSectionRequested.get()).toBe(false);
      expect(history.length).toBe(historyLength);
    },
    "design",
    "/?pageId=%2Fother&instance=other-section%2Cother-root&view=settings"
  );
});

test("a page-level Settings URL keeps its implicit page root", async () => {
  await withRouter(
    async () => {
      expect($selectedInstanceSelector.get()).toEqual(["other-root"]);
      expect($activeInspectorPanel.get()).toBe("settings");
      expect(new URLSearchParams(window.location.search).has("instance")).toBe(
        false
      );
    },
    "design",
    "/?pageId=other&view=settings"
  );
});

test("a Settings Variables URL opens the requested page and Global root on load and Back", async () => {
  const deepLink = "/?pageId=other&instance=%3Aroot&view=settings%2Fvariables";
  await withRouter(
    async ({ back }) => {
      expect($selectedPageId.get()).toBe("other");
      expect($selectedInstanceSelector.get()).toEqual([":root"]);
      expect($activeInspectorPanel.get()).toBe("settings");
      expect($variablesSectionRequested.get()).toBe(true);
      expect(window.location.pathname + window.location.search).toBe(deepLink);

      await act(async () => {
        $activeInspectorPanel.set("style");
        $variablesSectionRequested.set(false);
        selectPage("home");
      });
      await expect.poll(() => window.location.search).toBe("");
      await back();
      expect($selectedPageId.get()).toBe("other");
      expect($selectedInstanceSelector.get()).toEqual([":root"]);
      expect($activeInspectorPanel.get()).toBe("settings");
      expect($variablesSectionRequested.get()).toBe(true);
    },
    "design",
    deepLink
  );
});

test("repeated same-URL requests get distinct acknowledgements without adding a Back entry", async () => {
  await withRouter(async ({ request, back }) => {
    await request();
    await expect.poll(() => $pageNavigation.get()?.location?.key).toBeDefined();
    const firstKey = $pageNavigation.get()!.location!.key;
    const firstLength = history.length;
    await request();
    await expect.poll(() => $pageNavigation.get()?.location?.key).toBeDefined();
    expect($pageNavigation.get()!.location!.key).not.toBe(firstKey);
    expect(history.length).toBe(firstLength);
    await back();
    await expect.poll(() => $selectedPageHash.get().hash).toBe("");
  });
});

test("a queued identical request cannot take the previous request's Router key", async () => {
  await withRouter(async ({ request, back, block, commits, router }) => {
    block();
    const firstId = await request();
    await expect.poll(() => commits.length).toBe(1);
    const secondId = await request();
    expect(secondId).not.toBe(firstId);
    expect(commits).toHaveLength(1);
    await act(async () => commits[0]());
    await expect.poll(() => commits.length).toBe(2);
    const firstKey = router.state.location.key;
    const firstLength = history.length;
    expect($pageNavigation.get()?.id).toBe(secondId);
    expect($pageNavigation.get()?.location).toBeUndefined();
    await act(async () => commits[1]());
    await expect.poll(() => $pageNavigation.get()?.location?.key).toBeDefined();
    expect($pageNavigation.get()!.location!.key).not.toBe(firstKey);
    expect(history.length).toBe(firstLength);
    await back();
    await expect.poll(() => $selectedPageHash.get().hash).toBe("");
  });
});

test("Back cancels pending request ownership before Forward and another request", async () => {
  await withRouter(async ({ request, back, block, commits, router }) => {
    await request();
    await expect.poll(() => $pageNavigation.get()?.location?.key).toBeDefined();
    const homeKey = router.state.location.key;
    block();
    await request();
    await expect.poll(() => commits.length).toBe(1);
    await back();
    await expect.poll(() => $selectedPageHash.get().hash).toBe("");
    await act(
      async () =>
        new Promise<void>((resolve) => {
          window.addEventListener("popstate", () => resolve(), { once: true });
          router.navigate(1);
        })
    );
    await expect.poll(() => router.state.location.key).toBe(homeKey);
    await request("#next");
    await expect.poll(() => $pageNavigation.get()?.location?.key).toBeDefined();
    expect(
      new URLSearchParams(router.state.location.search).get("pageHash")
    ).toBe("#next");
    await act(async () => commits[0]());
  });
});

test("Preview opens from initial Design and again after Back", async () => {
  await withRouter(async ({ back, router }) => {
    await act(async () => $builderMode.set("preview"));
    expect($builderMode.get()).toBe("preview");
    await expect
      .poll(() => new URLSearchParams(router.state.location.search).get("mode"))
      .toBe("preview");
    await back();
    await expect.poll(() => $builderMode.get()).toBe("design");
    await act(async () => $builderMode.set("preview"));
    expect($builderMode.get()).toBe("preview");
  }, "design");
});

test("leaving Preview cancels pending ownership before a Design page change", async () => {
  await withRouter(async ({ request, block, commits, router }) => {
    block();
    await request();
    await expect.poll(() => commits.length).toBe(1);
    block(false);
    await act(async () => $builderMode.set("design"));
    await expect
      .poll(() => new URLSearchParams(router.state.location.search).get("mode"))
      .toBeNull();
    await act(async () => $selectedPageId.set("other"));
    await expect
      .poll(() =>
        new URLSearchParams(router.state.location.search).get("pageId")
      )
      .toBe("other");
    await act(async () => $builderMode.set("preview"));
    await expect
      .poll(() => new URLSearchParams(router.state.location.search).get("mode"))
      .toBe("preview");
    expect($builderMode.get()).toBe("preview");
    await act(async () => commits[0]());
  });
});
