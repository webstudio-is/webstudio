import { $syncStatus } from "@webstudio-is/sync-client";
import { submitPreviewForm } from "~/shared/preview-form-bridge";
import { describe, test, expect, vi } from "vitest";
import { __testing__ } from "./webstudio-component";
import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import { $pages } from "~/shared/sync/data-stores";
import { $selectedPageId, $selectedPageHash } from "~/shared/nano-states/pages";
import { $systemDataByPage } from "~/shared/system";
import { registerContainers } from "~/shared/sync/sync-stores";
import type { ManagedFormResponse } from "@webstudio-is/sdk/runtime";
import type { System } from "@webstudio-is/sdk";

vi.mock("~/shared/preview-form-bridge", () => ({ submitPreviewForm: vi.fn() }));

registerContainers();
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const { computeComponentKey, getPreviewCurrentUrl, getHtmlEmbedCanvasProps } =
  __testing__;

describe("getHtmlEmbedCanvasProps", () => {
  test.each([
    [undefined, "settled", true],
    [false, "settled", true],
    [true, "settled", false],
    [false, "pending", false],
  ] as const)(
    "sets HtmlEmbed script execution for safeMode=%p and resources=%p",
    (isSafeMode, resourcesState, executeScripts) => {
      expect(
        getHtmlEmbedCanvasProps({
          component: "HtmlEmbed",
          isSafeMode,
          resourcesState,
        })
      ).toEqual({ $ws$executeScripts: executeScripts });
    }
  );

  test("does not pass the private prop to other components", () => {
    expect(
      getHtmlEmbedCanvasProps({
        component: "Button",
        isSafeMode: false,
        resourcesState: "settled",
      })
    ).toEqual({});
  });
});

describe("computeComponentKey - key generation logic", () => {
  test("prioritizes assetId over other props", () => {
    expect(
      computeComponentKey({
        $webstudio$canvasOnly$assetId: "asset-123",
        src: "/image.jpg",
        defaultValue: "default",
      })
    ).toBe("asset-123");
  });

  test("falls back to defaultValue when no assetId", () => {
    expect(
      computeComponentKey({
        src: "/image.jpg",
        defaultValue: "default-value",
      })
    ).toBe("default-value");
  });

  test("uses src when no assetId or defaultValue", () => {
    expect(
      computeComponentKey({
        src: "/path/to/video.mp4",
      })
    ).toBe("/path/to/video.mp4");
  });

  test("returns undefined when no relevant props", () => {
    expect(computeComponentKey({})).toBeUndefined();
  });

  test("handles null and undefined values", () => {
    expect(
      computeComponentKey({
        src: null,
        defaultValue: undefined,
      })
    ).toBeUndefined();
  });

  test("coerces defaultValue to string", () => {
    expect(computeComponentKey({ defaultValue: 42 })).toBe("42");
    expect(computeComponentKey({ defaultValue: true })).toBe("true");
    expect(computeComponentKey({ defaultValue: 0 })).toBe("0");
  });

  test("coerces src to string", () => {
    expect(computeComponentKey({ src: "string-src" })).toBe("string-src");
    expect(computeComponentKey({ src: 123 })).toBe("123");
    expect(computeComponentKey({ src: undefined })).toBeUndefined();
  });

  test("different assetIds produce different keys", () => {
    const key1 = computeComponentKey({
      $webstudio$canvasOnly$assetId: "asset-123",
      src: "/image.jpg",
    });
    const key2 = computeComponentKey({
      $webstudio$canvasOnly$assetId: "asset-456",
      src: "/image.jpg",
    });

    expect(key1).not.toBe(key2);
  });

  test("different src values produce different keys", () => {
    const key1 = computeComponentKey({ src: "/assets/video1.mp4" });
    const key2 = computeComponentKey({ src: "/assets/video2.mp4" });

    expect(key1).not.toBe(key2);
  });
});

describe("getPreviewCurrentUrl", () => {
  test("builds current preview url from pathname, search, and selected hash", () => {
    const url = getPreviewCurrentUrl(
      {
        pathname: "/my-page",
        search: {
          tag: "blue",
          empty: "",
          missing: undefined,
        },
      },
      "#section"
    );

    expect(url.pathname).toBe("/my-page");
    expect(url.search).toBe("?tag=blue&empty=");
    expect(url.hash).toBe("#section");
  });

  test("preserves repeated query values for Preview Form submissions", () => {
    const url = getPreviewCurrentUrl(
      {
        pathname: "/contact",
        search: { choice: "b", source: "newsletter" },
        searchAll: { choice: ["a", "b"], source: ["newsletter"] },
      },
      ""
    );

    expect(url.searchParams.getAll("choice")).toEqual(["a", "b"]);
    expect(url.search).toBe("?choice=a&choice=b&source=newsletter");
  });
});

test("the Canvas Form adapter forwards dirty drafts to the parent persistence barrier", async () => {
  $syncStatus.set({ status: "syncing" });
  let finish:
    | ((response: Awaited<ReturnType<typeof submitPreviewForm>>) => void)
    | undefined;
  vi.mocked(submitPreviewForm).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  try {
    const settled = vi.fn();
    const signal = new AbortController().signal;
    const result = __testing__
      .submitManagedFormFromPreview(
        "form",
        { email: "visitor@example.com" },
        signal
      )
      .then(settled);
    expect(submitPreviewForm).toHaveBeenCalledWith(
      expect.objectContaining({
        managedFormId: "form",
        values: { email: "visitor@example.com" },
        signal,
      })
    );
    await Promise.resolve();
    expect(settled).not.toHaveBeenCalled();
    const response = { success: true, status: 200, results: [], errors: [] };
    finish?.(response);
    await result;
    expect(settled).toHaveBeenCalledWith(response);
  } finally {
    $syncStatus.set({ status: "idle" });
    vi.mocked(submitPreviewForm).mockReset();
  }
});

test.each(["query", "hash", "params"] as const)(
  "Preview %s navigation cancels a pending Form without remounting",
  async (navigation) => {
    const savedPages = $pages.get();
    const savedPageId = $selectedPageId.get();
    const savedSystemData = $systemDataByPage.get();
    const savedHash = $selectedPageHash.get();
    $pages.set({
      homePageId: "home",
      rootFolderId: "folder",
      folders: new Map([
        [
          "folder",
          { id: "folder", name: "Root", slug: "", children: ["home"] },
        ],
      ]),
      pages: new Map([
        [
          "home",
          {
            id: "home",
            name: "Home",
            title: "Home",
            path: ":slug",
            rootInstanceId: "body",
            meta: {},
          },
        ],
      ]),
    });
    $selectedPageId.set("home");
    $systemDataByPage.set(
      new Map([
        ["home", { params: { slug: "before" }, search: {}, searchAll: {} }],
      ])
    );
    $selectedPageHash.set({ hash: "" });
    const location = window.location.href;
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    let finish: ((response: ManagedFormResponse) => void) | undefined;
    let signal: AbortSignal | undefined;
    const redirect = vi.fn();
    const result = vi.fn();
    const state = vi.fn();
    const { PreviewNativeForm } = __testing__;
    try {
      await act(async () =>
        root.render(
          <PreviewNativeForm
            submission={{ destinations: ["resource"] }}
            successRedirect="/done"
            onManagedSubmit={(_values, requestSignal) => {
              signal = requestSignal;
              return new Promise((resolve) => {
                finish = resolve;
              });
            }}
            onSuccessRedirect={redirect}
            onResultChange={result}
            onStateChange={state}
          >
            <button type="submit">Send</button>
          </PreviewNativeForm>
        )
      );
      const form = container.querySelector("form");
      await act(async () => container.querySelector("button")?.click());
      expect(form?.getAttribute("aria-busy")).toBe("true");
      await act(async () => {
        if (navigation === "hash") {
          $selectedPageHash.set({ hash: "#next" });
        } else {
          $systemDataByPage.set(
            new Map<string, Pick<System, "params" | "search" | "searchAll">>([
              [
                "home",
                {
                  params: {
                    slug: navigation === "params" ? "after" : "before",
                  },
                  search: navigation === "query" ? { q: "next" } : {},
                  searchAll: navigation === "query" ? { q: ["next"] } : {},
                },
              ],
            ])
          );
        }
      });
      expect(container.querySelector("form")).toBe(form);
      expect(window.location.href).toBe(location);
      expect(signal?.aborted).toBe(true);
      await act(async () =>
        finish?.({ success: true, status: 200, results: [], errors: [] })
      );
      expect(redirect).not.toHaveBeenCalled();
      expect(result).not.toHaveBeenCalled();
      expect(state).not.toHaveBeenCalledWith("success");
      expect(form?.getAttribute("aria-busy")).toBeNull();
      expect(form?.getAttribute("data-state")).toBeNull();
    } finally {
      await act(async () => root.unmount());
      container.remove();
      $pages.set(savedPages);
      $selectedPageId.set(savedPageId);
      $systemDataByPage.set(savedSystemData);
      $selectedPageHash.set(savedHash);
    }
  }
);
