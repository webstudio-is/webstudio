import { describe, expect, test, vi } from "vitest";
import {
  augmentAuditWithRenderedChecks,
  getRenderedAuditViewports,
  getRenderedImageIssues,
  getRenderedResourceIssues,
} from "./mcp-rendered-audit";

const layout = {
  viewportWidth: 375,
  viewportHeight: 812,
  contentWidth: 375,
  contentHeight: 1600,
  horizontalOverflow: false,
  images: [],
  resources: [],
};

describe("rendered audit evidence", () => {
  test("captures mobile, desktop, and both sides of breakpoint edges", () => {
    expect(
      getRenderedAuditViewports({
        breakpoints: [
          { minWidth: 768 },
          { maxWidth: 991.5 },
          { minWidth: Number.NaN },
        ],
      })
    ).toEqual([
      { width: 375, height: 812 },
      { width: 767, height: 900 },
      { width: 768, height: 900 },
      { width: 992, height: 900 },
      { width: 993, height: 900 },
      { width: 1440, height: 900 },
    ]);
  });

  test("classifies broken, eager below-fold, and oversized images once", () => {
    expect(
      getRenderedImageIssues({
        ...layout,
        images: [
          {
            loading: "eager",
            complete: true,
            naturalWidth: 0,
            naturalHeight: 0,
            renderedWidth: 100,
            renderedHeight: 50,
            top: 900,
          },
          {
            loading: "eager",
            complete: true,
            naturalWidth: 100,
            naturalHeight: 100,
            renderedWidth: 100,
            renderedHeight: 100,
            top: 900,
          },
          {
            loading: "lazy",
            complete: true,
            naturalWidth: 1000,
            naturalHeight: 800,
            renderedWidth: 200,
            renderedHeight: 150,
            top: 0,
          },
        ],
      }).map(({ kind }) => kind)
    ).toEqual(["broken-image", "eager-below-fold-image", "oversized-image"]);
  });

  test("reports blocking resources and legacy font formats independently", () => {
    expect(
      getRenderedResourceIssues({
        ...layout,
        resources: [
          {
            pathname: "/fonts/brand.woff",
            initiatorType: "link",
            transferSize: 10,
            encodedBodySize: 8,
            decodedBodySize: 12,
            duration: 5,
            renderBlockingStatus: "blocking",
          },
        ],
      }).map(({ kind }) => kind)
    ).toEqual(["render-blocking-resource", "legacy-font-format"]);
  });

  test("rejects project-wide capture plans above the bounded limit", async () => {
    const startPreview = vi.fn();
    const stopPreview = vi.fn();
    const captureScreenshot = vi.fn();
    const result = await augmentAuditWithRenderedChecks({
      envelope: {
        operationId: "project.audit",
        source: "remote",
        projectId: "project",
        buildId: "build",
        version: 1,
        committed: false,
        result: {
          scopes: ["accessibility"],
          manualCheckCount: 1,
        },
      } as never,
      input: { rendered: true, verbose: true },
      executeRead: async (command) =>
        ({
          operationId:
            command === "list-pages" ? "pages.list" : "breakpoints.list",
          source: "remote",
          projectId: "project",
          buildId: "build",
          version: 1,
          committed: false,
          result:
            command === "list-pages"
              ? {
                  pages: Array.from({ length: 61 }, (_, index) => ({
                    id: `page-${index}`,
                    path: `/page-${index}`,
                  })),
                }
              : { breakpoints: [] },
        }) as never,
      startPreview,
      stopPreview,
      captureScreenshot,
    });

    expect(result.result).toMatchObject({
      renderedCheckCount: 0,
      renderedFailureCount: 1,
      renderedFailures: [
        {
          message: expect.stringContaining(
            "122 screenshots, exceeding the 120-screenshot limit"
          ),
        },
      ],
    });
    expect(startPreview).not.toHaveBeenCalled();
    expect(stopPreview).not.toHaveBeenCalled();
    expect(captureScreenshot).not.toHaveBeenCalled();
  });
});
