import { $syncStatus } from "@webstudio-is/sync-client";
import { submitPreviewForm } from "~/shared/preview-form-bridge";
import { describe, test, expect, vi } from "vitest";
import { __testing__ } from "./webstudio-component";

vi.mock("~/shared/preview-form-bridge", () => ({ submitPreviewForm: vi.fn() }));

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
