import type { ProjectSessionEnvelope } from "./project-session";
import type { RenderedAuditCheck, RenderedAuditFailure } from "./runtime/audit";
import { isRecord } from "./shared/type-utils";
import type {
  ProjectSessionScreenshotInput,
  ProjectSessionScreenshotResult,
} from "./mcp";

type Viewport = { width: number; height: number };

type RenderedAuditInput = Record<string, unknown> & {
  rendered: true;
};

type ExecuteRead = (
  command: "list-pages" | "list-breakpoints",
  input: unknown
) => Promise<ProjectSessionEnvelope>;

type StartPreview = (
  input: { source: "session" },
  progress: { report: (message: string) => void }
) => Promise<unknown>;

type CaptureScreenshot = (
  input: ProjectSessionScreenshotInput
) => Promise<ProjectSessionScreenshotResult>;

export const getRenderedAuditViewports = (breakpoints: unknown): Viewport[] => {
  const widths = new Set([375, 1440]);
  if (isRecord(breakpoints) && Array.isArray(breakpoints.breakpoints)) {
    for (const breakpoint of breakpoints.breakpoints) {
      if (isRecord(breakpoint) === false) {
        continue;
      }
      for (const [key, delta] of [
        ["minWidth", -1],
        ["minWidth", 0],
        ["maxWidth", 0],
        ["maxWidth", 1],
      ] as const) {
        const value = breakpoint[key];
        if (typeof value === "number" && Number.isFinite(value)) {
          widths.add(Math.max(1, Math.round(value) + delta));
        }
      }
    }
  }
  return [...widths]
    .sort((left, right) => left - right)
    .map((width) => ({ width, height: width <= 480 ? 812 : 900 }));
};

type Layout = NonNullable<ProjectSessionScreenshotResult["layout"]> & {
  images: NonNullable<
    NonNullable<ProjectSessionScreenshotResult["layout"]>["images"]
  >;
  resources: NonNullable<
    NonNullable<ProjectSessionScreenshotResult["layout"]>["resources"]
  >;
};

export const getRenderedImageIssues = (
  layout: Layout
): RenderedAuditCheck["imageIssues"] =>
  layout.images.flatMap((image) => {
    let kind: RenderedAuditCheck["imageIssues"][number]["kind"] | undefined;
    if (
      image.complete &&
      image.naturalWidth === 0 &&
      image.renderedWidth > 0 &&
      image.renderedHeight > 0
    ) {
      kind = "broken-image";
    } else if (image.top >= layout.viewportHeight && image.loading !== "lazy") {
      kind = "eager-below-fold-image";
    } else if (
      image.renderedWidth > 0 &&
      image.renderedHeight > 0 &&
      image.naturalWidth > image.renderedWidth * 2 &&
      image.naturalHeight > image.renderedHeight * 2
    ) {
      kind = "oversized-image";
    }
    return kind === undefined ? [] : [{ kind, ...image }];
  });

export const getRenderedResourceIssues = (
  layout: Layout
): RenderedAuditCheck["resourceIssues"] =>
  layout.resources.flatMap((resource) => {
    const issues: RenderedAuditCheck["resourceIssues"] = [];
    if (resource.renderBlockingStatus === "blocking") {
      issues.push({ kind: "render-blocking-resource", ...resource });
    }
    if (/\.(?:ttf|otf|woff)$/i.test(resource.pathname)) {
      issues.push({ kind: "legacy-font-format", ...resource });
    }
    return issues;
  });

const selectStaticPages = (pagesResult: unknown, input: RenderedAuditInput) =>
  isRecord(pagesResult) && Array.isArray(pagesResult.pages)
    ? pagesResult.pages.filter(
        (
          page
        ): page is Record<string, unknown> & { id: string; path: string } =>
          isRecord(page) &&
          typeof page.id === "string" &&
          typeof page.path === "string" &&
          page.path.includes(":") === false &&
          page.path.includes("*") === false &&
          (typeof input.pageId !== "string" || page.id === input.pageId) &&
          (typeof input.pagePath !== "string" || page.path === input.pagePath)
      )
    : [];

const mergeRenderedAudit = ({
  envelope,
  input,
  checks,
  failures,
  complete,
}: {
  envelope: ProjectSessionEnvelope;
  input: RenderedAuditInput;
  checks: RenderedAuditCheck[];
  failures: RenderedAuditFailure[];
  complete: boolean;
}): ProjectSessionEnvelope => {
  const result = envelope.result;
  if (isRecord(result) === false) {
    return envelope;
  }
  const renderedIssueCount = checks.reduce(
    (count, check) => count + check.issues.length,
    0
  );
  const isVerbose = input.verbose === true;
  const manualChecks =
    isVerbose && Array.isArray(result.manualChecks)
      ? result.manualChecks.filter(
          (check) =>
            complete === false ||
            (isRecord(check) && check.checkId !== "responsive-visual-review")
        )
      : undefined;
  return {
    ...envelope,
    result: {
      ...result,
      renderedCheckCount: checks.length,
      renderedIssueCount,
      renderedFailureCount: failures.length,
      manualCheckCount:
        complete === false
          ? result.manualCheckCount
          : Math.max(
              0,
              typeof result.manualCheckCount === "number"
                ? result.manualCheckCount - 1
                : 0
            ),
      ...(isVerbose
        ? {
            renderedChecks: checks,
            renderedFailures: failures,
            manualChecks: manualChecks ?? [],
          }
        : {}),
    },
  };
};

export const augmentAuditWithRenderedChecks = async ({
  envelope,
  input,
  executeRead,
  startPreview,
  captureScreenshot,
  reportProgress,
}: {
  envelope: ProjectSessionEnvelope;
  input: unknown;
  executeRead: ExecuteRead;
  startPreview?: StartPreview;
  captureScreenshot?: CaptureScreenshot;
  reportProgress?: (message: string) => void;
}): Promise<ProjectSessionEnvelope> => {
  if (
    isRecord(input) === false ||
    input.rendered !== true ||
    startPreview === undefined ||
    captureScreenshot === undefined ||
    isRecord(envelope.result) === false
  ) {
    return envelope;
  }
  const renderedInput = input as RenderedAuditInput;
  const result = envelope.result;
  const performanceEnabled =
    Array.isArray(result.scopes) && result.scopes.includes("performance");
  const checks: RenderedAuditCheck[] = [];
  const failures: RenderedAuditFailure[] = [];
  const finish = (complete: boolean) =>
    mergeRenderedAudit({
      envelope,
      input: renderedInput,
      checks,
      failures,
      complete,
    });

  reportProgress?.("tool audit preparing rendered responsive checks");
  let pagesEnvelope: ProjectSessionEnvelope;
  let breakpointsEnvelope: ProjectSessionEnvelope;
  try {
    pagesEnvelope = await executeRead("list-pages", {});
    breakpointsEnvelope = await executeRead("list-breakpoints", {});
    await startPreview(
      { source: "session" },
      { report: (message) => reportProgress?.(message) }
    );
  } catch (error) {
    failures.push({
      message: `Rendered audit could not start: ${error instanceof Error ? error.message : String(error)}`,
    });
    return finish(false);
  }

  const pages = selectStaticPages(pagesEnvelope.result, renderedInput);
  const viewports = getRenderedAuditViewports(breakpointsEnvelope.result);
  if (pages.length === 0) {
    failures.push({
      message: "Rendered audit found no static page paths to capture.",
    });
    return finish(false);
  }

  for (const page of pages) {
    for (const viewport of viewports) {
      const pagePath = page.path || "/";
      reportProgress?.(
        `tool audit capturing ${pagePath} at ${viewport.width}px`
      );
      try {
        const screenshot = await captureScreenshot({
          path: pagePath,
          source: "session",
          viewport,
          fullPage: true,
          includeImageMetrics: performanceEnabled,
          includeResourceMetrics: performanceEnabled,
          browser: "auto",
        });
        if (screenshot.layout === undefined) {
          failures.push({
            pageId: page.id,
            pagePath,
            viewport,
            message: "Screenshot did not return rendered layout metrics.",
          });
          continue;
        }
        const layout: Layout = {
          ...screenshot.layout,
          images: screenshot.layout.images ?? [],
          resources: screenshot.layout.resources ?? [],
        };
        const imageIssues = performanceEnabled
          ? getRenderedImageIssues(layout)
          : [];
        const resourceIssues = performanceEnabled
          ? getRenderedResourceIssues(layout)
          : [];
        checks.push({
          pageId: page.id,
          pagePath,
          viewport,
          screenshotPath: screenshot.output,
          layout,
          issues: [
            ...(layout.horizontalOverflow
              ? (["horizontal-overflow"] as const)
              : []),
            ...imageIssues.map((issue) => issue.kind),
            ...resourceIssues.map((issue) => issue.kind),
          ],
          imageIssues,
          resourceIssues,
        });
      } catch (error) {
        failures.push({
          pageId: page.id,
          pagePath,
          viewport,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
  return finish(
    failures.length === 0 && checks.length === pages.length * viewports.length
  );
};
