import { useLayoutEffect, useRef } from "react";
import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import { expect, test } from "vitest";
import { createDefaultPages } from "@webstudio-is/project-build";
import {
  $builderMode,
  $selectedPageHash,
  $selectedPageId,
  $pageNavigation,
  requestPageNavigation,
} from "~/shared/nano-states";
import { $pages } from "~/shared/sync/data-stores";
import { useHashLinkSync } from "./use-switch-page";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const withPreview = async (
  check: (controls: {
    navigate: (key?: string, hash?: string) => Promise<void>;
    scroll: (top: number) => Promise<void>;
  }) => Promise<void>
) => {
  const savedPages = $pages.get();
  const savedPageId = $selectedPageId.get();
  const savedHash = $selectedPageHash.get();
  const savedMode = $builderMode.get();
  const savedNavigation = $pageNavigation.get();
  const savedBehavior = document.documentElement.style.scrollBehavior;
  $pages.set(
    createDefaultPages({ homePageId: "home", rootInstanceId: "home-root" })
  );
  $selectedPageId.set("home");
  $builderMode.set("preview");
  document.documentElement.style.scrollBehavior = "auto";
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const Preview = () => {
    useHashLinkSync("home-root");
    return (
      <div data-ws-id="home-root" style={{ height: 6000 }}>
        <div style={{ height: 1800 }} />
        <div id="target">Target</div>
      </div>
    );
  };
  const navigate = async (key?: string, hash = "") => {
    await act(async () => {
      const pending = $pageNavigation.get();
      const location = key ? { key, type: "POP" as const } : undefined;
      if (location && pending && !pending.location && pending.hash === hash) {
        $pageNavigation.set({ ...pending, location });
      } else {
        requestPageNavigation({ pageId: "home", hash, location });
      }
      root.render(<Preview />);
    });
  };
  const scroll = async (top: number) => {
    await act(async () => {
      window.scrollTo({ top, behavior: "instant" });
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      );
    });
  };
  try {
    await navigate("before-anchor");
    await check({ navigate, scroll });
  } finally {
    await act(async () => root.unmount());
    container.remove();
    document.documentElement.style.scrollBehavior = savedBehavior;
    $pages.set(savedPages);
    $selectedPageId.set(savedPageId);
    $selectedPageHash.set(savedHash);
    $builderMode.set(savedMode);
    $pageNavigation.set(savedNavigation);
  }
};

test("each explicit same-hash request scrolls to its anchor", async () => {
  await withPreview(async ({ navigate, scroll }) => {
    await navigate(undefined, "#target");
    const targetPosition = scrollY;
    expect(targetPosition).toBeGreaterThan(1700);
    await scroll(900);
    await navigate(undefined, "#target");
    expect(scrollY).toBe(targetPosition);
  });
});

test("anchor scrolling before a delayed Router key does not overwrite the outgoing position", async () => {
  await withPreview(async ({ navigate, scroll }) => {
    await scroll(900);
    await navigate(undefined, "#target");
    await scroll(1200);
    await navigate("anchor", "#target");
    await scroll(1800);
    await navigate("before-anchor");
    expect(scrollY).toBe(900);
  });
});

test("returning to Preview restores the same entry after Design scrolling", async () => {
  await withPreview(async ({ navigate, scroll }) => {
    await scroll(900);
    await act(async () => $builderMode.set("design"));
    await scroll(100);
    await act(async () => $builderMode.set("preview"));
    await navigate("before-anchor");
    expect(scrollY).toBe(900);
  });
});

test("a missing anchor still records manual scrolling for Back", async () => {
  await withPreview(async ({ navigate, scroll }) => {
    await navigate("missing", "#missing");
    await scroll(1300);
    await navigate("away");
    await navigate("missing", "#missing");
    expect(scrollY).toBe(1300);
  });
});

test("leaving Preview cancels a delayed anchor observer", async () => {
  await withPreview(async ({ navigate, scroll }) => {
    await navigate("missing", "#missing");
    await act(async () => $builderMode.set("design"));
    await scroll(100);
    const target = document.createElement("div");
    target.id = "missing";
    document.querySelector('[data-ws-id="home-root"]')!.appendChild(target);
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve())
    );
    expect(scrollY).toBe(100);
  });
});

test("Preview restores native history entries before child animations and ignores selection replacements", async () => {
  const savedPages = $pages.get();
  const savedPageId = $selectedPageId.get();
  const savedHash = $selectedPageHash.get();
  const savedMode = $builderMode.get();
  const savedNavigation = $pageNavigation.get();
  const savedBehavior = document.documentElement.style.scrollBehavior;
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
  $builderMode.set("preview");
  document.documentElement.style.scrollBehavior = "smooth";
  const starts: number[] = [];
  const Animation = ({ id }: { id: string }) => {
    const ref = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
      starts.push(scrollY);
      const animation = ref.current!.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 10_000,
      });
      return () => animation.cancel();
    }, [id]);
    return <div ref={ref}>Animation</div>;
  };
  const PreviewPage = ({ id }: { id: string }) => {
    useHashLinkSync(`${id}-root`);
    return (
      <div
        key={id}
        data-ws-id={`${id}-root`}
        style={{ height: id === "home" ? 6000 : 4000 }}
      >
        <Animation id={id} />
        <div style={{ height: 1800 }} />
        <div id={`${id}-anchor`}>Anchor</div>
      </div>
    );
  };
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const render = async (
    id: string,
    key?: string,
    type: "PUSH" | "POP" | "REPLACE" = "PUSH"
  ) => {
    await act(async () => {
      $selectedPageId.set(id);
      const pending = $pageNavigation.get();
      const location = key ? { key, type } : undefined;
      if (
        pending?.pageId === id &&
        location &&
        (!pending.location || type === "REPLACE")
      ) {
        $pageNavigation.set({ ...pending, location });
      } else {
        requestPageNavigation({ pageId: id, hash: "", location });
      }
      root.render(<PreviewPage id={id} />);
    });
  };
  const scroll = async (top: number) => {
    await act(async () => {
      window.scrollTo({ top, behavior: "instant" });
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      );
    });
    expect(scrollY).toBe(top);
  };
  try {
    await render("home", "home-first", "POP");
    await scroll(900);
    // Canvas selection arrives before the Builder commits its new location key.
    await render("other");
    expect(starts.at(-1)).toBe(0);
    expect(scrollY).toBe(0);
    await render("other", "other-first");
    await scroll(1600);
    await render("home", "home-first", "POP");
    expect(starts.at(-1)).toBe(900);
    expect(scrollY).toBe(900);
    await render("other", "other-first", "POP");
    expect(starts.at(-1)).toBe(1600);
    expect(scrollY).toBe(1600);
    // A new visit to the same page is a new entry, not its previous position.
    await render("other", "other-second");
    expect(scrollY).toBe(0);
    await scroll(1200);
    await render("other", "other-selection", "REPLACE");
    expect(scrollY).toBe(1200);
    await render("other", "other-first", "POP");
    expect(scrollY).toBe(1600);
    await act(async () =>
      requestPageNavigation({
        pageId: "other",
        hash: "#other-anchor",
        location: { key: "other-anchor", type: "PUSH" },
      })
    );
    await scroll(2400);
    await act(async () =>
      $pageNavigation.set({
        ...$pageNavigation.get()!,
        location: { key: "other-anchor-selection", type: "REPLACE" },
      })
    );
    expect(scrollY).toBe(2400);
    await render("home", "home-second");
    await act(async () => {
      $selectedPageId.set("other");
      requestPageNavigation({
        pageId: "other",
        hash: "#other-anchor",
        location: { key: "other-anchor-selection", type: "POP" },
      });
      root.render(<PreviewPage id="other" />);
    });
    const restoredPositions: number[] = [];
    for (let frame = 0; frame < 6; frame += 1) {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve())
      );
      restoredPositions.push(scrollY);
    }
    expect(restoredPositions).toEqual(Array(6).fill(2400));
    await render("home", "home-long");
    await scroll(4800);
    await render("other", "other-short");
    await render("home", "home-long", "POP");
    expect(starts.at(-1)).toBe(4800);
    expect(scrollY).toBe(4800);
    expect(document.documentElement.style.scrollBehavior).toBe("smooth");
  } finally {
    act(() => root.unmount());
    expect(document.getAnimations()).toHaveLength(0);
    container.remove();
    document.documentElement.style.scrollBehavior = savedBehavior;
    $pages.set(savedPages);
    $selectedPageId.set(savedPageId);
    $selectedPageHash.set(savedHash);
    $builderMode.set(savedMode);
    $pageNavigation.set(savedNavigation);
  }
});
