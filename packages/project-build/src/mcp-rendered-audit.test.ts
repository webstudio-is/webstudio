import { describe, expect, test, vi } from "vitest";
import type { ProjectSessionScreenshotInput } from "./mcp";
import {
  __testing__,
  augmentAuditWithRenderedChecks,
  getRenderedAuditOverallTimeout,
  getRenderedAuditViewports,
  getRenderedImageIssues,
  getRenderedResourceIssues,
} from "./mcp-rendered-audit";

const { mergeRenderedAudit } = __testing__;

const layout = {
  documentType: "text/html",
  viewportWidth: 375,
  viewportHeight: 812,
  contentWidth: 375,
  contentHeight: 1600,
  horizontalOverflow: false,
  images: [],
  resources: [],
};

const getNavigation = (path: string) => ({
  requestedUrl: `http://127.0.0.1:5177${path}`,
  finalUrl: `http://127.0.0.1:5177${path}`,
  status: 200,
  statusText: "OK",
  mimeType: "text/html",
  redirects: [],
  documentReadyState: "complete",
  generatedSiteRootPresent: true,
  layoutStable: true,
});

describe("rendered audit evidence", () => {
  test("budgets five minutes for each confirmed capture batch", () => {
    expect(getRenderedAuditOverallTimeout(1)).toBe(5 * 60_000);
    expect(getRenderedAuditOverallTimeout(120)).toBe(5 * 60_000);
    expect(getRenderedAuditOverallTimeout(121)).toBe(10 * 60_000);
    expect(getRenderedAuditOverallTimeout(396)).toBe(20 * 60_000);
    expect(getRenderedAuditOverallTimeout(396, 1234)).toBe(1234);
  });

  test("matches the public root path to the stored empty home path", async () => {
    const captureScreenshot = vi.fn(async (input) => ({
      output: `/tmp/home-${input.viewport.width}.png`,
      browserPath: "/usr/bin/chromium",
      browser: "chromium" as const,
      viewport: input.viewport,
      fullPage: true,
      elapsedMs: 10,
      warnings: [],
      navigation: getNavigation("/"),
      layout,
    }));
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
          manualCheckCount: 0,
          verbose: true,
        },
      } as never,
      input: { rendered: true, pagePath: "/", verbose: true },
      executeRead: async (command) =>
        ({
          result:
            command === "list-pages"
              ? { pages: [{ id: "home", path: "" }] }
              : { breakpoints: [] },
        }) as never,
      startPreview: vi.fn(),
      stopPreview: vi.fn(),
      captureScreenshot,
    });

    expect(captureScreenshot).toHaveBeenCalledOnce();
    expect(result.result).toMatchObject({
      renderedPlan: {
        pages: [{ pageId: "home", pagePath: "/" }],
        captureCount: 1,
      },
      renderedFailureCount: 0,
    });
  });

  test("loads pages and breakpoints concurrently", async () => {
    let activeReads = 0;
    let maximumActiveReads = 0;
    const executeRead = vi.fn(async (command: string) => {
      activeReads += 1;
      maximumActiveReads = Math.max(maximumActiveReads, activeReads);
      await new Promise((resolve) => setTimeout(resolve, 10));
      activeReads -= 1;
      return {
        result:
          command === "list-pages"
            ? { pages: [{ id: "home", path: "" }] }
            : { breakpoints: [] },
      } as never;
    });

    await augmentAuditWithRenderedChecks({
      envelope: {
        operationId: "project.audit",
        source: "remote",
        projectId: "project",
        buildId: "build",
        version: 1,
        committed: false,
        result: {
          scopes: ["accessibility"],
          manualCheckCount: 0,
          verbose: true,
        },
      } as never,
      input: { rendered: true, verbose: true },
      executeRead,
      startPreview: vi.fn(),
      stopPreview: vi.fn(),
      captureScreenshot: vi.fn(async (input) => ({
        output: "/tmp/home.png",
        browserPath: "/usr/bin/chromium",
        browser: "chromium" as const,
        viewport: input.viewport,
        fullPage: true,
        elapsedMs: 10,
        warnings: [],
        navigation: getNavigation("/"),
        layout,
      })),
    });

    expect(maximumActiveReads).toBe(2);
  });

  test("captures each page once and resizes through its viewport plan", async () => {
    const captureScreenshot = vi.fn();
    const capturePageScreenshots = vi.fn(
      async (inputs: readonly ProjectSessionScreenshotInput[]) =>
        inputs.map((input) => ({
          output: `/tmp/page-${input.viewport.width}.png`,
          browserPath: "/usr/bin/chromium",
          browser: "chromium" as const,
          viewport: input.viewport,
          fullPage: true,
          elapsedMs: 10,
          warnings: [],
          timings: {
            wallMs: 25,
            targetSetupMs: 5,
            navigationMs: 20,
            readinessMs: 4,
            imageInspectionMs: 3,
            resourceInspectionMs: 1,
            screenshotMs: 8,
            artifactWriteMs: 2,
            targetCleanupMs: input.viewport.width === 1440 ? 1 : 0,
          },
          navigation: getNavigation("/page"),
          layout: {
            ...layout,
            viewportWidth: input.viewport.width,
            viewportHeight: input.viewport.height,
          },
        }))
    );
    const storeRenderedAuditArtifacts = vi.fn(async () => "/manifest.json");

    const result = await augmentAuditWithRenderedChecks({
      envelope: {
        operationId: "project.audit",
        source: "remote",
        projectId: "project",
        buildId: "build",
        version: 1,
        committed: false,
        result: {
          scopes: ["performance"],
          manualCheckCount: 0,
          verbose: true,
        },
      } as never,
      input: { rendered: true, pagePath: "/page", verbose: true },
      executeRead: async (command) =>
        ({
          result:
            command === "list-pages"
              ? { pages: [{ id: "page", path: "/page" }] }
              : { breakpoints: [] },
        }) as never,
      startPreview: vi.fn(),
      stopPreview: vi.fn(),
      captureScreenshot,
      capturePageScreenshots,
      storeRenderedAuditArtifacts,
    });

    expect(capturePageScreenshots).toHaveBeenCalledOnce();
    expect(capturePageScreenshots).toHaveBeenCalledWith([
      expect.objectContaining({
        path: "/page",
        output: ".webstudio/audits/screenshots/page-1440x900.webp",
        viewport: { width: 1440, height: 900 },
        waitForTimeout: 0,
      }),
    ]);
    expect(captureScreenshot).not.toHaveBeenCalled();
    expect(result.result).toMatchObject({
      renderedCheckCount: 1,
      renderedFailureCount: 0,
    });
    expect(storeRenderedAuditArtifacts).toHaveBeenCalledWith(
      expect.objectContaining({
        screenshot: {
          format: "webp",
          quality: 82,
          scale: 0.5,
        },
        performance: {
          captureCount: 1,
          previewStartMs: expect.any(Number),
          captureWallMs: expect.any(Number),
          previewStopMs: expect.any(Number),
          targetSetupMs: 5,
          navigationMs: 20,
          readinessMs: 4,
          imageInspectionMs: 3,
          resourceInspectionMs: 1,
          screenshotMs: 8,
          artifactWriteMs: 2,
          targetCleanupMs: 1,
        },
      })
    );
  });

  test("falls back to isolated captures when resized page capture fails", async () => {
    const capturePageScreenshots = vi.fn(async () => {
      throw new Error("responsive script failed during resize");
    });
    const captureScreenshot = vi.fn(async (input) => ({
      output: `/tmp/fallback-${input.viewport.width}.png`,
      browserPath: "/usr/bin/chromium",
      browser: "chromium" as const,
      viewport: input.viewport,
      fullPage: true,
      elapsedMs: 10,
      warnings: [],
      navigation: getNavigation("/page"),
      layout,
    }));

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
          manualCheckCount: 0,
          verbose: true,
        },
      } as never,
      input: { rendered: true, pagePath: "/page", verbose: true },
      executeRead: async (command) =>
        ({
          result:
            command === "list-pages"
              ? { pages: [{ id: "page", path: "/page" }] }
              : { breakpoints: [] },
        }) as never,
      startPreview: vi.fn(),
      stopPreview: vi.fn(),
      captureScreenshot,
      capturePageScreenshots,
    });

    expect(capturePageScreenshots).toHaveBeenCalledOnce();
    expect(captureScreenshot).toHaveBeenCalledOnce();
    expect(result.result).toMatchObject({
      renderedCheckCount: 1,
      renderedFailureCount: 0,
    });
  });

  test("isolates a failed page without falling back healthy concurrent pages", async () => {
    const pages = Array.from({ length: 7 }, (_, index) => ({
      id: `page-${index}`,
      path: index === 0 ? "/bad" : `/page-${index}`,
    }));
    const capturePageScreenshots = vi.fn(
      async (inputs: readonly ProjectSessionScreenshotInput[]) => {
        if (inputs.some((input) => input.path === "/bad")) {
          throw new Error("bad page did not become ready");
        }
        return inputs.map((input) => {
          const path = input.path ?? "/";
          return {
            output: `/tmp/${path.slice(1)}-${input.viewport.width}.webp`,
            browserPath: "/usr/bin/chromium",
            browser: "chromium" as const,
            viewport: input.viewport,
            fullPage: true,
            elapsedMs: 1,
            warnings: [],
            navigation: getNavigation(path),
            layout,
          };
        });
      }
    );
    const captureScreenshot = vi.fn(async (input) => ({
      output: `/tmp/bad-${input.viewport.width}.webp`,
      browserPath: "/usr/bin/chromium",
      browser: "chromium" as const,
      viewport: input.viewport,
      fullPage: true,
      elapsedMs: 1,
      warnings: [],
      navigation: getNavigation("/bad"),
      layout,
    }));

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
          manualCheckCount: 0,
          verbose: true,
        },
      } as never,
      input: { rendered: true, verbose: true },
      executeRead: async (command) =>
        ({
          result: command === "list-pages" ? { pages } : { breakpoints: [] },
        }) as never,
      startPreview: vi.fn(),
      stopPreview: vi.fn(),
      captureScreenshot,
      capturePageScreenshots,
    });

    expect(capturePageScreenshots).toHaveBeenCalledTimes(7);
    expect(captureScreenshot).toHaveBeenCalledOnce();
    expect(captureScreenshot.mock.calls.map(([input]) => input.path)).toEqual([
      "/bad",
    ]);
    expect(result.result).toMatchObject({
      renderedCheckCount: 7,
      renderedFailureCount: 0,
    });
  });

  test("captures a common device viewport in each breakpoint range", () => {
    expect(
      getRenderedAuditViewports({
        breakpoints: [
          { label: "Base" },
          { label: "Tablet", maxWidth: 991 },
          { label: "Mobile landscape", maxWidth: 767 },
          { label: "Mobile portrait", maxWidth: 479 },
          { label: "Large", minWidth: 1280 },
          { label: "Wide", minWidth: 1440 },
        ],
      })
    ).toEqual([
      {
        width: 390,
        height: 844,
        purposes: ["Mobile portrait: representative"],
      },
      {
        width: 667,
        height: 375,
        purposes: ["Mobile landscape: representative"],
      },
      {
        width: 820,
        height: 1180,
        purposes: ["Tablet: representative"],
      },
      {
        width: 1024,
        height: 768,
        purposes: ["base breakpoint: representative"],
      },
      {
        width: 1366,
        height: 768,
        purposes: ["Large: representative"],
      },
      {
        width: 1440,
        height: 900,
        purposes: ["Wide: representative"],
      },
    ]);
  });

  test("uses a desktop viewport when the project only has a base breakpoint", () => {
    expect(
      getRenderedAuditViewports({
        breakpoints: [{ id: "base", label: "Base" }],
      })
    ).toEqual([
      {
        width: 1440,
        height: 900,
        purposes: ["base breakpoint: desktop"],
      },
    ]);
  });

  test("does not assign one capture failure to unrelated captures", () => {
    const result = mergeRenderedAudit({
      envelope: {
        operationId: "project.audit",
        source: "remote",
        projectId: "project",
        buildId: "build",
        version: 1,
        committed: false,
        result: {
          scopes: ["accessibility"],
          manualCheckCount: 0,
          verbose: true,
        },
      } as never,
      input: { rendered: true, verbose: true },
      checks: [],
      failures: [
        {
          code: "RENDERED_AUDIT_SCREENSHOT_FAILED",
          phase: "capture",
          retryable: true,
          remediation: "Retry this capture.",
          pageId: "one",
          pagePath: "/one",
          viewport: { width: 1440, height: 900 },
          message: "Capture failed.",
        },
      ],
      plan: {
        version: 1,
        pages: [
          { pageId: "one", pagePath: "/one" },
          { pageId: "two", pagePath: "/two" },
        ],
        excludedPages: [],
        viewports: [
          {
            width: 1440,
            height: 900,
            purposes: ["base breakpoint: desktop"],
          },
        ],
        checks: ["horizontal-overflow"],
        captureCount: 2,
      },
    });

    expect(result.result).toMatchObject({
      renderedCaptureStatuses: [
        {
          pageId: "one",
          status: "failed",
          failureCode: "RENDERED_AUDIT_SCREENSHOT_FAILED",
        },
        { pageId: "two", status: "skipped" },
      ],
    });
    expect(
      (result.result as { renderedCaptureStatuses: Array<unknown> })
        .renderedCaptureStatuses[1]
    ).not.toHaveProperty("failureCode");
  });

  test("does not hide real failures behind a confirmation state", () => {
    const result = mergeRenderedAudit({
      envelope: {
        operationId: "project.audit",
        source: "remote",
        projectId: "project",
        buildId: "build",
        version: 1,
        committed: false,
        result: { scopes: ["performance"], manualCheckCount: 0 },
      } as never,
      input: { rendered: true },
      checks: [],
      failures: [
        {
          code: "RENDERED_AUDIT_CONFIRMATION_REQUIRED",
          phase: "planning",
          retryable: false,
          remediation: "Confirm the planned run.",
          message: "Confirmation required.",
        },
        {
          code: "RENDERED_AUDIT_SCREENSHOT_FAILED",
          phase: "capture",
          retryable: true,
          remediation: "Retry the capture.",
          message: "Capture failed.",
        },
      ],
    });

    expect(result.result).toMatchObject({ renderedState: "failed" });
  });

  test("summarizes rendered issue kinds in compact results", () => {
    const result = mergeRenderedAudit({
      envelope: {
        operationId: "project.audit",
        source: "remote",
        projectId: "project",
        buildId: "build",
        version: 1,
        committed: false,
        result: {
          scopes: ["performance"],
          manualCheckCount: 0,
          verbose: false,
        },
      } as never,
      input: { rendered: true },
      checks: [
        {
          pageId: "home",
          pagePath: "/",
          viewport: { width: 390, height: 844 },
          issues: ["oversized-image", "oversized-image", "broken-image"],
        },
        {
          pageId: "home",
          pagePath: "/",
          viewport: { width: 1440, height: 900 },
          issues: ["oversized-image"],
        },
      ] as never,
      failures: [],
    });

    expect(result.result).toMatchObject({
      renderedIssueCount: 4,
      renderedIssueSummaries: [
        {
          kind: "oversized-image",
          count: 3,
          captureCount: 2,
          pagePaths: ["/"],
        },
        {
          kind: "broken-image",
          count: 1,
          captureCount: 1,
          pagePaths: ["/"],
        },
      ],
    });
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

  test("uses the selected response bitmap dimensions for oversized images", () => {
    const issues = getRenderedImageIssues({
      ...layout,
      images: [
        {
          loading: "lazy",
          complete: true,
          naturalWidth: 2000,
          naturalHeight: 1200,
          selectedSourceWidth: 400,
          selectedSourceHeight: 240,
          renderedWidth: 300,
          renderedHeight: 180,
          top: 0,
        },
        {
          loading: "lazy",
          complete: true,
          naturalWidth: 300,
          naturalHeight: 180,
          selectedSourceWidth: 1600,
          selectedSourceHeight: 960,
          renderedWidth: 300,
          renderedHeight: 180,
          top: 0,
        },
      ],
    });

    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      kind: "oversized-image",
      selectedSourceWidth: 1600,
      selectedSourceHeight: 960,
    });
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

  test("does not report vector sizing or an eager source already used above the fold", () => {
    expect(
      getRenderedImageIssues({
        ...layout,
        images: [
          {
            sourcePathname: "/assets/mark.svg",
            loading: "eager",
            complete: true,
            naturalWidth: 280,
            naturalHeight: 280,
            renderedWidth: 30,
            renderedHeight: 30,
            top: 10,
          },
          {
            sourcePathname: "/assets/mark.svg",
            loading: "eager",
            complete: true,
            naturalWidth: 280,
            naturalHeight: 280,
            renderedWidth: 30,
            renderedHeight: 30,
            top: 900,
          },
        ],
      })
    ).toEqual([]);
  });

  test("does not report the generated application stylesheet", () => {
    expect(
      getRenderedResourceIssues({
        ...layout,
        resources: [
          {
            pathname: "/assets/index-DIEIbGZp.css",
            initiatorType: "link",
            transferSize: 10,
            encodedBodySize: 8,
            decodedBodySize: 12,
            duration: 5,
            renderBlockingStatus: "blocking",
          },
        ],
      })
    ).toEqual([]);
  });

  test("classifies an HTTP error capture as failed rendered evidence", async () => {
    const storeRenderedAuditArtifacts = vi.fn(async () => "/manifest.json");
    const result = await augmentAuditWithRenderedChecks({
      envelope: {
        operationId: "project.audit",
        source: "remote",
        projectId: "project",
        buildId: "build",
        version: 1,
        committed: false,
        result: {
          scopes: ["performance"],
          manualCheckCount: 0,
          verbose: true,
        },
      } as never,
      input: { rendered: true, pagePath: "/missing", verbose: true },
      executeRead: async (command) =>
        ({
          result:
            command === "list-pages"
              ? { pages: [{ id: "missing", path: "/missing" }] }
              : { breakpoints: [] },
        }) as never,
      startPreview: vi.fn(),
      stopPreview: vi.fn(),
      captureScreenshot: vi.fn(async () => ({
        output: "/tmp/missing.png",
        browserPath: "/usr/bin/chromium",
        browser: "chromium" as const,
        viewport: { width: 375, height: 812 },
        fullPage: true,
        elapsedMs: 10,
        warnings: [],
        navigation: {
          requestedUrl: "http://127.0.0.1:5177/missing",
          finalUrl: "http://127.0.0.1:5177/missing",
          status: 404,
          statusText: "Not Found",
          mimeType: "text/html",
          redirects: [],
          documentReadyState: "complete",
          generatedSiteRootPresent: true,
          layoutStable: true,
        },
        layout,
      })),
      storeRenderedAuditArtifacts,
    });

    expect(result.result).toMatchObject({
      renderedState: "failed",
      renderedCheckCount: 0,
      renderedFailureCount: 1,
      renderedCaptureSummary: {
        planned: 1,
        passed: 0,
        issues: 0,
        skipped: 0,
        failed: 1,
      },
      renderedCaptureStatuses: [
        expect.objectContaining({
          pagePath: "/missing",
          status: "failed",
          screenshotPath: "/tmp/missing.png",
          failureCode: "RENDERED_AUDIT_HTTP_ERROR",
        }),
      ],
      renderedFailures: [
        expect.objectContaining({
          code: "RENDERED_AUDIT_HTTP_ERROR",
          pagePath: "/missing",
          message: expect.stringContaining("HTTP 404"),
        }),
      ],
      renderedArtifactManifest: {
        version: 1,
        path: "/manifest.json",
        screenshotCount: 1,
      },
    });
    expect(storeRenderedAuditArtifacts).toHaveBeenCalledWith(
      expect.objectContaining({
        failures: [
          expect.objectContaining({ screenshotPath: "/tmp/missing.png" }),
        ],
      })
    );
  });

  test("accepts an intentional generated redirect", async () => {
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
          manualCheckCount: 0,
          verbose: true,
        },
      } as never,
      input: { rendered: true, pagePath: "/old", verbose: true },
      executeRead: async (command) =>
        ({
          result:
            command === "list-pages"
              ? { pages: [{ id: "old", path: "/old" }] }
              : { breakpoints: [] },
        }) as never,
      startPreview: vi.fn(),
      stopPreview: vi.fn(),
      captureScreenshot: vi.fn(async (input) => ({
        output: `/tmp/redirect-${input.viewport.width}.png`,
        browserPath: "/usr/bin/chromium",
        browser: "chromium" as const,
        viewport: input.viewport,
        fullPage: true,
        elapsedMs: 10,
        warnings: [],
        navigation: {
          ...getNavigation("/new"),
          requestedUrl: "http://127.0.0.1:5177/old",
          redirects: ["http://127.0.0.1:5177/old"],
        },
        layout,
      })),
    });

    expect(result.result).toMatchObject({
      renderedState: "complete",
      renderedCheckCount: 1,
      renderedFailureCount: 0,
      renderedCaptureSummary: {
        planned: 1,
        passed: 1,
        issues: 0,
        skipped: 0,
        failed: 0,
      },
    });
  });

  test("returns partial evidence when one capture succeeds and one fails", async () => {
    const stopPreview = vi.fn();
    const result = await augmentAuditWithRenderedChecks({
      envelope: {
        operationId: "project.audit",
        source: "remote",
        projectId: "project",
        buildId: "build",
        version: 1,
        committed: false,
        result: {
          scopes: ["performance"],
          manualCheckCount: 0,
          verbose: true,
        },
      } as never,
      input: { rendered: true, verbose: true },
      executeRead: async (command) =>
        ({
          result:
            command === "list-pages"
              ? {
                  pages: [
                    { id: "good", path: "/good" },
                    { id: "bad", path: "/bad" },
                  ],
                }
              : { breakpoints: [] },
        }) as never,
      startPreview: vi.fn(),
      stopPreview,
      captureScreenshot: vi.fn(async (input) => {
        if (input.path === "/bad") {
          throw new Error("browser page closed");
        }
        return {
          output: "/tmp/good.png",
          browserPath: "/usr/bin/chromium",
          browser: "chromium" as const,
          viewport: input.viewport,
          fullPage: true,
          elapsedMs: 1,
          warnings: [],
          navigation: getNavigation("/good"),
          layout,
        };
      }),
    });

    expect(result.result).toMatchObject({
      renderedState: "partial",
      renderedCheckCount: 1,
      renderedFailureCount: 1,
      renderedCaptureSummary: {
        planned: 2,
        passed: 1,
        failed: 1,
      },
      renderedFailures: [
        expect.objectContaining({
          code: "RENDERED_AUDIT_SCREENSHOT_FAILED",
          retryable: true,
        }),
      ],
    });
    expect(stopPreview).toHaveBeenCalledOnce();
  });

  test("accepts a generated non-HTML document without an HTML marker", async () => {
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
          manualCheckCount: 0,
          verbose: true,
        },
      } as never,
      input: { rendered: true, pagePath: "/sitemap.xml", verbose: true },
      executeRead: async (command) =>
        ({
          result:
            command === "list-pages"
              ? { pages: [{ id: "sitemap", path: "/sitemap.xml" }] }
              : { breakpoints: [] },
        }) as never,
      startPreview: vi.fn(),
      stopPreview: vi.fn(),
      captureScreenshot: vi.fn(async (input) => ({
        output: `/tmp/sitemap-${input.viewport.width}.png`,
        browserPath: "/usr/bin/chromium",
        browser: "chromium" as const,
        viewport: input.viewport,
        fullPage: true,
        elapsedMs: 10,
        warnings: [],
        navigation: {
          ...getNavigation("/sitemap.xml"),
          mimeType: "application/xml",
          generatedSiteRootPresent: false,
        },
        layout: { ...layout, documentType: "application/xml" },
      })),
    });

    expect(result.result).toMatchObject({
      renderedState: "complete",
      renderedCheckCount: 1,
      renderedFailureCount: 0,
      renderedCaptureSummary: {
        planned: 1,
        passed: 1,
        issues: 0,
        skipped: 0,
        failed: 0,
      },
    });
  });

  test("classifies bounded capture timeouts and preserves reconciliation", async () => {
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
          verbose: true,
        },
      } as never,
      input: { rendered: true, pagePath: "/slow", verbose: true },
      executeRead: async (command) =>
        ({
          result:
            command === "list-pages"
              ? { pages: [{ id: "slow", path: "/slow" }] }
              : { breakpoints: [] },
        }) as never,
      startPreview: vi.fn(),
      stopPreview: vi.fn(),
      captureScreenshot: vi.fn(
        async (): Promise<never> => await new Promise<never>(() => {})
      ),
      timeouts: { capture: 5 },
    });

    expect(result.result).toMatchObject({
      renderedState: "failed",
      renderedCheckCount: 0,
      renderedFailureCount: 1,
      renderedCaptureSummary: {
        planned: 1,
        passed: 0,
        issues: 0,
        skipped: 0,
        failed: 1,
      },
      renderedFailures: [
        expect.objectContaining({ code: "RENDERED_AUDIT_CAPTURE_TIMEOUT" }),
      ],
    });
  });

  test("does not retry an unresolved resized capture after its timeout", async () => {
    const captureScreenshot = vi.fn();
    const result = await augmentAuditWithRenderedChecks({
      envelope: {
        operationId: "project.audit",
        source: "remote",
        projectId: "project",
        buildId: "build",
        version: 1,
        committed: false,
        result: { scopes: ["performance"], manualCheckCount: 0, verbose: true },
      } as never,
      input: { rendered: true, pagePath: "/slow", verbose: true },
      executeRead: async (command) =>
        ({
          result:
            command === "list-pages"
              ? { pages: [{ id: "slow", path: "/slow" }] }
              : { breakpoints: [] },
        }) as never,
      startPreview: vi.fn(),
      stopPreview: vi.fn(),
      captureScreenshot,
      capturePageScreenshots: vi.fn(
        async (): Promise<never> => await new Promise<never>(() => {})
      ),
      timeouts: { page: 5 },
    });

    expect(captureScreenshot).not.toHaveBeenCalled();
    expect(result.result).toMatchObject({
      renderedState: "failed",
      renderedFailureCount: 1,
      renderedCaptureSummary: { planned: 1, failed: 1 },
      renderedFailures: [
        expect.objectContaining({ code: "RENDERED_AUDIT_CAPTURE_TIMEOUT" }),
      ],
    });
  });

  test("requires and consumes confirmation for a large unchanged plan", async () => {
    const startPreview = vi.fn();
    const stopPreview = vi.fn();
    const captureScreenshot = vi.fn(async (input) => ({
      output: `/tmp/${input.path}-${input.viewport.width}.png`,
      browserPath: "/browser",
      browser: "chromium" as const,
      viewport: input.viewport,
      fullPage: true,
      elapsedMs: 1,
      warnings: [],
      navigation: getNavigation(input.path ?? "/"),
      layout: {
        ...layout,
        viewportWidth: input.viewport.width,
        viewportHeight: input.viewport.height,
      },
    }));
    const envelope = {
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
    } as never;
    const executeRead = async (command: "list-pages" | "list-breakpoints") =>
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
                pages: Array.from({ length: 122 }, (_, index) => ({
                  id: `page-${index}`,
                  path: `/page-${index}`,
                })),
              }
            : { breakpoints: [] },
      }) as never;
    const result = await augmentAuditWithRenderedChecks({
      envelope,
      input: { rendered: true, verbose: true },
      executeRead,
      startPreview,
      stopPreview,
      captureScreenshot,
    });

    expect(result.result).toMatchObject({
      renderedState: "confirmation-required",
      renderedPlan: {
        version: 1,
        pages: expect.arrayContaining([
          { pageId: "page-0", pagePath: "/page-0" },
        ]),
        excludedPages: [],
        viewports: [
          expect.objectContaining({
            width: 1440,
            purposes: ["base breakpoint: desktop"],
          }),
        ],
        checks: ["horizontal-overflow"],
        captureCount: 122,
        confirmationToken: expect.any(String),
        confirmationExpiresAt: expect.any(String),
      },
      renderedCheckCount: 0,
      renderedFailureCount: 1,
      renderedCaptureSummary: {
        planned: 122,
        passed: 0,
        issues: 0,
        skipped: 122,
        failed: 0,
      },
      renderedFailures: [
        {
          code: "RENDERED_AUDIT_CONFIRMATION_REQUIRED",
          phase: "planning",
          retryable: false,
          remediation: expect.stringContaining("confirmLargeRun"),
          message: expect.stringContaining(
            "122 screenshots, exceeding the 120-screenshot unconfirmed threshold"
          ),
        },
      ],
    });
    expect(startPreview).not.toHaveBeenCalled();
    expect(stopPreview).not.toHaveBeenCalled();
    expect(captureScreenshot).not.toHaveBeenCalled();

    const plan = (result.result as Record<string, unknown>)
      .renderedPlan as Record<string, unknown>;
    const confirmed = await augmentAuditWithRenderedChecks({
      envelope,
      input: {
        rendered: true,
        verbose: true,
        confirmLargeRun: true,
        confirmationToken: plan.confirmationToken,
      },
      executeRead,
      startPreview,
      stopPreview,
      captureScreenshot,
    });

    expect(confirmed.result).toMatchObject({
      renderedState: "complete",
      renderedCheckCount: 122,
      renderedFailureCount: 0,
      renderedCaptureSummary: {
        planned: 122,
        passed: 122,
        issues: 0,
        skipped: 0,
        failed: 0,
      },
    });
    expect(startPreview).toHaveBeenCalledOnce();
    expect(stopPreview).toHaveBeenCalledOnce();
    expect(captureScreenshot).toHaveBeenCalledTimes(122);

    const secondPlan = await augmentAuditWithRenderedChecks({
      envelope,
      input: { rendered: true, verbose: true },
      executeRead,
      startPreview,
      stopPreview,
      captureScreenshot,
    });
    const secondToken = (
      (secondPlan.result as Record<string, unknown>).renderedPlan as Record<
        string,
        unknown
      >
    ).confirmationToken;
    const stale = await augmentAuditWithRenderedChecks({
      envelope: {
        operationId: "project.audit",
        source: "remote",
        projectId: "project",
        buildId: "build",
        version: 2,
        committed: false,
        result: {
          scopes: ["accessibility"],
          manualCheckCount: 1,
        },
      } as never,
      input: {
        rendered: true,
        verbose: true,
        confirmLargeRun: true,
        confirmationToken: secondToken,
      },
      executeRead,
      startPreview,
      stopPreview,
      captureScreenshot,
    });
    expect(stale.result).toMatchObject({
      renderedState: "confirmation-required",
      renderedCheckCount: 0,
      renderedFailures: [
        expect.objectContaining({
          code: "RENDERED_AUDIT_CONFIRMATION_INVALID",
        }),
      ],
    });
    expect(startPreview).toHaveBeenCalledOnce();
  });

  test("explains excluded dynamic routes without starting preview", async () => {
    const startPreview = vi.fn();
    const result = await augmentAuditWithRenderedChecks({
      envelope: {
        operationId: "project.audit",
        source: "remote",
        projectId: "project",
        buildId: "build",
        version: 1,
        committed: false,
        result: {
          scopes: ["performance"],
          manualCheckCount: 1,
          verbose: false,
        },
      } as never,
      input: { rendered: true, pagePath: "/blog/:slug" },
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
              ? { pages: [{ id: "post", path: "/blog/:slug" }] }
              : { breakpoints: [{ id: "tablet", maxWidth: 991 }] },
        }) as never,
      startPreview,
      stopPreview: vi.fn(),
      captureScreenshot: vi.fn(),
    });

    expect(result.result).toMatchObject({
      renderedState: "failed",
      renderedPlan: {
        pages: [],
        excludedPages: [
          {
            pageId: "post",
            pagePath: "/blog/:slug",
            reason: "dynamic-route-needs-example",
          },
        ],
        viewports: expect.arrayContaining([
          expect.objectContaining({
            width: 390,
            purposes: ["tablet: representative"],
          }),
        ]),
        checks: [
          "horizontal-overflow",
          "broken-image",
          "eager-below-fold-image",
          "oversized-image",
          "render-blocking-resource",
          "legacy-font-format",
        ],
        captureCount: 0,
      },
      renderedFailureCount: 1,
      renderedFailureSummaries: [
        expect.objectContaining({ code: "RENDERED_AUDIT_NO_STATIC_PAGES" }),
      ],
    });
    expect(startPreview).not.toHaveBeenCalled();
  });

  test("stops scheduling captures and cleans up when the caller cancels", async () => {
    const controller = new AbortController();
    const startPreview = vi.fn();
    const stopPreview = vi.fn();
    const captureScreenshot = vi.fn(() => {
      controller.abort();
      return new Promise<never>(() => undefined);
    });
    const result = await augmentAuditWithRenderedChecks({
      envelope: {
        operationId: "project.audit",
        source: "remote",
        projectId: "project",
        buildId: "build",
        version: 1,
        committed: false,
        result: {
          scopes: ["performance"],
          manualCheckCount: 0,
          verbose: true,
        },
      } as never,
      input: { rendered: true, verbose: true },
      executeRead: async (command) =>
        ({
          result:
            command === "list-pages"
              ? { pages: [{ id: "home", path: "/" }] }
              : { breakpoints: [] },
        }) as never,
      startPreview,
      stopPreview,
      captureScreenshot,
      signal: controller.signal,
    });

    expect(result.result).toMatchObject({
      renderedState: "failed",
      renderedCheckCount: 0,
      renderedCaptureSummary: {
        planned: 1,
        skipped: 1,
        failed: 0,
      },
      renderedFailures: [
        expect.objectContaining({ code: "RENDERED_AUDIT_CANCELLED" }),
      ],
    });
    expect(startPreview).toHaveBeenCalledOnce();
    expect(captureScreenshot).toHaveBeenCalledOnce();
    expect(stopPreview).toHaveBeenCalledOnce();
  });

  test("captures a caller-supplied concrete example for a dynamic route", async () => {
    const storeRenderedAuditArtifacts = vi.fn(
      async () => "/project/.webstudio/audits/rendered-project-1.json"
    );
    const captureScreenshot = vi.fn(async (input) => ({
      output: `/tmp/post-${input.viewport.width}.png`,
      browserPath: "/browser",
      browser: "chromium" as const,
      viewport: input.viewport,
      fullPage: true,
      elapsedMs: 1,
      warnings: [],
      navigation: getNavigation(input.path ?? "/"),
      layout: {
        ...layout,
        viewportWidth: input.viewport.width,
        viewportHeight: input.viewport.height,
      },
    }));
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
          verbose: true,
        },
      } as never,
      input: {
        rendered: true,
        verbose: true,
        pageId: "post",
        routeExamples: [{ pageId: "post", path: "/blog/hello?draft=1" }],
      },
      executeRead: async (command) =>
        ({
          result:
            command === "list-pages"
              ? { pages: [{ id: "post", path: "/blog/:slug" }] }
              : { breakpoints: [] },
        }) as never,
      startPreview: vi.fn(),
      stopPreview: vi.fn(),
      captureScreenshot,
      storeRenderedAuditArtifacts,
    });

    expect(captureScreenshot).toHaveBeenCalledOnce();
    expect(captureScreenshot).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/blog/hello?draft=1" })
    );
    expect(result.result).toMatchObject({
      renderedPlan: {
        pages: [{ pageId: "post", pagePath: "/blog/hello?draft=1" }],
        excludedPages: [],
        captureCount: 1,
      },
      renderedCaptureSummary: {
        planned: 1,
        passed: 1,
        issues: 0,
        skipped: 0,
        failed: 0,
      },
      renderedArtifactManifest: {
        version: 1,
        path: "/project/.webstudio/audits/rendered-project-1.json",
        screenshotCount: 1,
      },
    });
    expect(storeRenderedAuditArtifacts).toHaveBeenCalledWith(
      expect.objectContaining({
        version: 1,
        auditContractVersion: 2,
        projectId: "project",
        projectVersion: 1,
        captureStatuses: [
          expect.objectContaining({
            pagePath: "/blog/hello?draft=1",
            screenshotPath: "/tmp/post-1440.png",
          }),
        ],
        checks: [
          expect.objectContaining({
            screenshotPath: "/tmp/post-1440.png",
            layout: expect.objectContaining({
              navigation: expect.objectContaining({
                finalUrl: "http://127.0.0.1:5177/blog/hello?draft=1",
                status: 200,
                generatedSiteRootPresent: true,
              }),
            }),
          }),
        ],
        failures: [],
      })
    );
  });

  test("treats empty and slash home paths as the same rendered page", async () => {
    const captureScreenshot = vi.fn(async (input) => ({
      output: "/tmp/home.webp",
      browserPath: "/browser",
      browser: "chromium" as const,
      viewport: input.viewport,
      fullPage: true,
      elapsedMs: 1,
      warnings: [],
      navigation: getNavigation(input.path ?? "/"),
      layout,
    }));

    const result = await augmentAuditWithRenderedChecks({
      envelope: {
        operationId: "project.audit",
        source: "remote",
        projectId: "project",
        buildId: "build",
        version: 1,
        committed: false,
        result: { scopes: ["accessibility"], manualCheckCount: 1 },
      } as never,
      input: { rendered: true, pagePath: "" },
      executeRead: async (command) =>
        ({
          result:
            command === "list-pages"
              ? { pages: [{ id: "home", path: "" }] }
              : { breakpoints: [] },
        }) as never,
      startPreview: vi.fn(),
      stopPreview: vi.fn(),
      captureScreenshot,
    });

    expect(captureScreenshot).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/" })
    );
    expect(result.result).toMatchObject({
      renderedPlan: {
        pages: [{ pageId: "home", pagePath: "/" }],
        captureCount: 1,
      },
      renderedCaptureSummary: { passed: 1, failed: 0 },
    });
  });
});
