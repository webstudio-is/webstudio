import type { ProjectSessionEnvelope } from "./project-session";
import type {
  GeneratedBuildMetrics,
  RenderedAuditCheck,
  RenderedAuditFailure,
  renderedAuditPlan,
} from "./runtime/audit";
import {
  auditContractVersion,
  generatedBuildMetrics as generatedBuildMetricsSchema,
  renderedAuditManifestVersion,
} from "./runtime/audit";
import type { z } from "zod";
import { isRecord } from "./shared/type-utils";
import type {
  ProjectSessionScreenshotInput,
  ProjectSessionScreenshotResult,
} from "./mcp";
import {
  createConfirmationToken,
  validateConfirmationToken,
} from "./confirmation-token";

type Viewport = { width: number; height: number; purposes: string[] };
type RenderedAuditPlan = z.infer<typeof renderedAuditPlan>;

type RenderedAuditInput = Record<string, unknown> & {
  rendered: true;
  confirmLargeRun?: boolean;
  confirmationToken?: string;
  imageDomains?: string[];
  routeExamples?: Array<{ pageId: string; path: string }>;
};

type ExecuteRead = (
  command: "list-pages" | "list-breakpoints",
  input: unknown
) => Promise<ProjectSessionEnvelope>;

const readAllPaginatedItems = async (
  executeRead: ExecuteRead,
  command: "list-pages" | "list-breakpoints",
  key: "pages" | "breakpoints"
) => {
  const items: unknown[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | undefined;
  let firstEnvelope: ProjectSessionEnvelope | undefined;
  do {
    const envelope = await executeRead(command, { cursor, limit: 200 });
    firstEnvelope ??= envelope;
    if (isRecord(envelope.result) === false) {
      throw new Error(`${command} returned an invalid result.`);
    }
    const page = envelope.result[key];
    if (Array.isArray(page) === false) {
      throw new Error(`${command} did not return ${key}.`);
    }
    items.push(...page);
    const nextCursor = envelope.result.nextCursor;
    cursor = typeof nextCursor === "string" ? nextCursor : undefined;
    if (cursor !== undefined && seenCursors.has(cursor)) {
      throw new Error(`${command} returned a repeated pagination cursor.`);
    }
    if (cursor !== undefined) {
      seenCursors.add(cursor);
    }
  } while (cursor !== undefined);
  if (firstEnvelope === undefined || isRecord(firstEnvelope.result) === false) {
    throw new Error(`${command} returned no result.`);
  }
  return {
    ...firstEnvelope,
    result: { ...firstEnvelope.result, [key]: items, nextCursor: null },
  };
};

type StartPreview = (
  input: { source: "session"; port: number; imageDomains?: string[] },
  progress: { report: (message: string) => void }
) => Promise<{ url: string; generatedBuildMetrics?: unknown }>;

type CaptureScreenshot = (
  input: ProjectSessionScreenshotInput
) => Promise<ProjectSessionScreenshotResult>;

type CapturePageScreenshots = (
  inputs: readonly ProjectSessionScreenshotInput[]
) => Promise<ProjectSessionScreenshotResult[]>;

type StopPreview = () => Promise<unknown>;

export type RenderedAuditArtifactManifest = {
  version: typeof renderedAuditManifestVersion;
  auditContractVersion: typeof auditContractVersion;
  projectId: string;
  buildId: string;
  projectVersion: number;
  plan: RenderedAuditPlan;
  captureStatuses: Array<Record<string, unknown>>;
  checks: RenderedAuditCheck[];
  failures: RenderedAuditFailure[];
  screenshot: {
    format: "webp";
    quality: 82;
    scale: 0.5;
  };
  performance: {
    captureCount: number;
    previewStartMs: number;
    captureWallMs: number;
    previewStopMs: number;
    targetSetupMs: number;
    navigationMs: number;
    readinessMs: number;
    imageInspectionMs: number;
    resourceInspectionMs: number;
    screenshotMs: number;
    artifactWriteMs: number;
    targetCleanupMs: number;
  };
  generatedBuildMetrics: GeneratedBuildMetrics | null;
};

type StoreRenderedAuditArtifacts = (
  manifest: RenderedAuditArtifactManifest
) => Promise<string>;

export const maxRenderedAuditCaptures = 120;
const renderedAuditConfirmationTtlMs = 5 * 60 * 1000;
const renderedAuditScreenshotTimeout = 10_000;
const renderedAuditCaptureTimeout = 30_000;
const renderedAuditPageTimeout = 120_000;
const renderedAuditOverallTimeout = 5 * 60_000;
const automaticPreviewPort = 0;
const renderedAuditCaptureConcurrency = 6;

const getRenderedAuditCaptureKey = (
  pageId: string,
  viewport: { width: number; height: number }
) => `${pageId}\n${viewport.width}\n${viewport.height}`;

const getRenderedIssueConfidence = (
  kind: RenderedAuditCheck["issues"][number]
) =>
  kind === "hidden-content" ||
  kind === "overlapping-elements" ||
  kind === "cross-breakpoint-layout-change" ||
  kind === "eager-below-fold-image" ||
  kind === "oversized-image"
    ? ("advisory" as const)
    : ("exact" as const);

const getRenderedAuditScreenshotInput = ({
  pageId,
  pagePath,
  viewport,
  performanceEnabled,
  accessibilityEnabled,
}: {
  pageId: string;
  pagePath: string;
  viewport: { width: number; height: number };
  performanceEnabled: boolean;
  accessibilityEnabled: boolean;
}): ProjectSessionScreenshotInput => ({
  path: pagePath,
  output: `.webstudio/audits/screenshots/${pageId.replaceAll(/[^a-z0-9_-]/gi, "_")}-${viewport.width}x${viewport.height}.webp`,
  source: "session",
  viewport: { width: viewport.width, height: viewport.height },
  fullPage: true,
  includeImageMetrics: performanceEnabled,
  includeResourceMetrics: performanceEnabled,
  includeContrastMetrics: accessibilityEnabled,
  browser: "auto",
  waitForTimeout: 0,
  timeout: renderedAuditScreenshotTimeout,
  format: "webp",
  quality: 82,
  scale: 0.5,
});

export const getRenderedAuditOverallTimeout = (
  captureCount: number,
  override?: number
) =>
  override ??
  Math.max(1, Math.ceil(captureCount / maxRenderedAuditCaptures)) *
    renderedAuditOverallTimeout;

class RenderedAuditCaptureTimeoutError extends Error {}
class RenderedAuditCancelledError extends Error {}

const withRenderedAuditCancellation = async <Result>(
  promise: Promise<Result>,
  signal: AbortSignal | undefined
) => {
  if (signal === undefined) {
    return await promise;
  }
  if (signal.aborted) {
    throw new RenderedAuditCancelledError("Rendered audit was cancelled.");
  }
  let rejectCancellation: ((error: Error) => void) | undefined;
  const onAbort = () => {
    rejectCancellation?.(
      new RenderedAuditCancelledError("Rendered audit was cancelled.")
    );
  };
  const cancelled = new Promise<never>((_resolve, reject) => {
    rejectCancellation = reject;
    signal.addEventListener("abort", onAbort, { once: true });
  });
  try {
    return await Promise.race([promise, cancelled]);
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
};

const withRenderedAuditCaptureTimeout = async <Result>(
  promise: Promise<Result>,
  timeoutMs: number
) => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(
          () =>
            reject(
              new RenderedAuditCaptureTimeoutError(
                `Rendered capture exceeded ${timeoutMs}ms.`
              )
            ),
          timeoutMs
        );
        timeout.unref?.();
      }),
    ]);
  } finally {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
  }
};

const getRenderedAuditPlanSignature = ({
  envelope,
  input,
  plan,
}: {
  envelope: ProjectSessionEnvelope;
  input: RenderedAuditInput;
  plan: RenderedAuditPlan;
}) =>
  JSON.stringify({
    projectId: envelope.projectId,
    buildId: envelope.buildId,
    version: envelope.version,
    scopes: input.scopes,
    severities: input.severities,
    pageId: input.pageId,
    pagePath: input.pagePath,
    imageDomains: input.imageDomains,
    routeExamples: input.routeExamples,
    plan: {
      version: plan.version,
      pages: plan.pages,
      viewports: plan.viewports,
      checks: plan.checks,
      captureCount: plan.captureCount,
    },
  });

const createRenderedAuditConfirmation = (signature: string) =>
  createConfirmationToken(signature, renderedAuditConfirmationTtlMs);

const validateRenderedAuditConfirmation = (
  token: string | undefined,
  signature: string
) => validateConfirmationToken(token, signature);

export const getRenderedAuditViewports = (breakpoints: unknown): Viewport[] => {
  const popularViewports = [
    { width: 390, height: 844 },
    { width: 667, height: 375 },
    { width: 820, height: 1180 },
    { width: 1024, height: 768 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ];
  const widths = new Map<number, { height: number; purposes: Set<string> }>();
  const addViewport = (
    viewport: { width: number; height: number },
    purpose: string
  ) => {
    const purposes = widths.get(viewport.width)?.purposes ?? new Set<string>();
    purposes.add(purpose);
    widths.set(viewport.width, { height: viewport.height, purposes });
  };
  const addRepresentative = (
    minimum: number,
    maximum: number | undefined,
    purpose: string
  ) => {
    const candidates = popularViewports.filter(
      ({ width }) =>
        width >= minimum && (maximum === undefined || width <= maximum)
    );
    const viewport =
      maximum === undefined
        ? candidates[0]
        : candidates.sort(
            (left, right) =>
              Math.abs(left.width - (minimum + maximum) / 2) -
              Math.abs(right.width - (minimum + maximum) / 2)
          )[0];
    addViewport(
      viewport ?? {
        width: maximum ?? minimum,
        height: (maximum ?? minimum) <= 480 ? 844 : 900,
      },
      purpose
    );
  };
  const records =
    isRecord(breakpoints) && Array.isArray(breakpoints.breakpoints)
      ? breakpoints.breakpoints.flatMap((breakpoint, index) => {
          if (isRecord(breakpoint) === false) {
            return [];
          }
          const label =
            typeof breakpoint.label === "string"
              ? breakpoint.label
              : typeof breakpoint.id === "string"
                ? breakpoint.id
                : `breakpoint ${index + 1}`;
          const minWidth =
            typeof breakpoint.minWidth === "number" &&
            Number.isFinite(breakpoint.minWidth)
              ? Math.max(1, Math.round(breakpoint.minWidth))
              : undefined;
          const maxWidth =
            typeof breakpoint.maxWidth === "number" &&
            Number.isFinite(breakpoint.maxWidth)
              ? Math.max(1, Math.round(breakpoint.maxWidth))
              : undefined;
          return [{ label, minWidth, maxWidth }];
        })
      : [];
  const minimumBreakpoints = records
    .filter(
      (breakpoint): breakpoint is typeof breakpoint & { minWidth: number } =>
        breakpoint.minWidth !== undefined
    )
    .sort((left, right) => left.minWidth - right.minWidth);
  const maximumBreakpoints = records
    .filter(
      (breakpoint): breakpoint is typeof breakpoint & { maxWidth: number } =>
        breakpoint.minWidth === undefined && breakpoint.maxWidth !== undefined
    )
    .sort((left, right) => left.maxWidth - right.maxWidth);
  if (minimumBreakpoints.length === 0 && maximumBreakpoints.length === 0) {
    addViewport(popularViewports[5], "base breakpoint: desktop");
  }
  let previousMaximum = 0;
  for (const breakpoint of maximumBreakpoints) {
    addRepresentative(
      previousMaximum + 1,
      breakpoint.maxWidth,
      `${breakpoint.label}: representative`
    );
    previousMaximum = breakpoint.maxWidth;
  }
  const firstMinimum = minimumBreakpoints[0]?.minWidth;
  if (minimumBreakpoints.length > 0 || maximumBreakpoints.length > 0) {
    const baseMaximum =
      firstMinimum === undefined ? undefined : firstMinimum - 1;
    if (baseMaximum === undefined || previousMaximum < baseMaximum) {
      addRepresentative(
        previousMaximum + 1,
        baseMaximum,
        "base breakpoint: representative"
      );
    }
  }
  for (const [index, breakpoint] of minimumBreakpoints.entries()) {
    const nextMinimum = minimumBreakpoints[index + 1]?.minWidth;
    addRepresentative(
      breakpoint.minWidth,
      breakpoint.maxWidth ??
        (nextMinimum === undefined ? undefined : nextMinimum - 1),
      `${breakpoint.label}: representative`
    );
  }
  return [...widths.entries()]
    .sort(([left], [right]) => left - right)
    .map(([width, { height, purposes }]) => ({
      width,
      height,
      purposes: [...purposes],
    }));
};

type Layout = NonNullable<ProjectSessionScreenshotResult["layout"]> & {
  images: NonNullable<
    NonNullable<ProjectSessionScreenshotResult["layout"]>["images"]
  >;
  resources: NonNullable<
    NonNullable<ProjectSessionScreenshotResult["layout"]>["resources"]
  >;
  contrasts: NonNullable<
    NonNullable<ProjectSessionScreenshotResult["layout"]>["contrasts"]
  >;
};

type GeometryLayout = Layout & {
  elementGeometry: RenderedAuditCheck["layout"]["elementGeometry"];
};

const emptyElementGeometry: GeometryLayout["elementGeometry"] = {
  total: 0,
  sampled: 0,
  truncated: false,
  elements: [],
};

export const getRenderedGeometryIssues = (
  layout: GeometryLayout
): RenderedAuditCheck["geometryIssues"] => {
  const issues: RenderedAuditCheck["geometryIssues"] = [];
  for (const element of layout.elementGeometry.elements) {
    if (element.clippedX || element.clippedY) {
      issues.push({
        kind: "clipped-content",
        confidence: "exact",
        instanceId: element.instanceId,
        message: "Rendered content exceeds a clipping boundary.",
        evidence: {
          clippedX: element.clippedX,
          clippedY: element.clippedY,
        },
      });
    }
    for (const relatedInstanceId of element.overlapsWith) {
      if (element.instanceId.localeCompare(relatedInstanceId) >= 0) {
        continue;
      }
      issues.push({
        kind: "overlapping-elements",
        confidence: "advisory",
        instanceId: element.instanceId,
        relatedInstanceId,
        message:
          "Rendered element bounds overlap; inspect the screenshot to determine whether this is intentional.",
        evidence: {},
      });
    }
  }
  return issues;
};

const addCrossBreakpointGeometryIssues = (
  checks: RenderedAuditCheck[]
): RenderedAuditCheck[] => {
  const checksByPage = checks.reduce((pages, check) => {
    const pageChecks = pages.get(check.pageId) ?? [];
    pageChecks.push(check);
    pages.set(check.pageId, pageChecks);
    return pages;
  }, new Map<string, RenderedAuditCheck[]>());
  const additions = new Map<
    RenderedAuditCheck,
    RenderedAuditCheck["geometryIssues"]
  >();
  for (const pageChecks of checksByPage.values()) {
    pageChecks.sort(
      (left, right) => left.viewport.width - right.viewport.width
    );
    const elementsByCheck = pageChecks.map(
      (check) =>
        new Map(
          check.layout.elementGeometry.elements.map((element) => [
            element.instanceId,
            element,
          ])
        )
    );
    const firstCheck = pageChecks[0];
    const firstElements = elementsByCheck[0];
    if (firstCheck !== undefined && firstElements !== undefined) {
      const hiddenIssues = additions.get(firstCheck) ?? [];
      for (const [instanceId, element] of firstElements) {
        if (
          elementsByCheck.every(
            (elements) => elements.get(instanceId)?.visible === false
          )
        ) {
          hiddenIssues.push({
            kind: "hidden-content",
            confidence: "advisory",
            instanceId,
            message:
              "This element is hidden at every audited viewport; verify that it is intentionally unreachable.",
            evidence: { hiddenReason: element.hiddenReason },
          });
        }
      }
      additions.set(firstCheck, hiddenIssues);
    }
    for (let index = 1; index < pageChecks.length; index++) {
      const previous = pageChecks[index - 1]!;
      const check = pageChecks[index]!;
      const previousElements = elementsByCheck[index - 1]!;
      const geometryIssues = additions.get(check) ?? [];
      for (const element of check.layout.elementGeometry.elements) {
        const previousElement = previousElements.get(element.instanceId);
        if (previousElement === undefined) {
          continue;
        }
        const normalizedXChange = Math.abs(
          previousElement.x / previous.viewport.width -
            element.x / check.viewport.width
        );
        const normalizedWidthChange = Math.abs(
          previousElement.width / previous.viewport.width -
            element.width / check.viewport.width
        );
        const overlapChanged =
          [...previousElement.overlapsWith].sort().join("\n") !==
          [...element.overlapsWith].sort().join("\n");
        if (
          previousElement.visible === element.visible &&
          normalizedXChange <= 0.35 &&
          normalizedWidthChange <= 0.6 &&
          overlapChanged === false
        ) {
          continue;
        }
        geometryIssues.push({
          kind: "cross-breakpoint-layout-change",
          confidence: "advisory",
          instanceId: element.instanceId,
          message:
            "This element changes visibility, position, size, or overlap state between audited breakpoints; inspect both screenshots.",
          evidence: {
            sourceViewportWidth: previous.viewport.width,
            targetViewportWidth: check.viewport.width,
            sourceVisible: previousElement.visible,
            targetVisible: element.visible,
            sourceX: previousElement.x,
            targetX: element.x,
            sourceWidth: previousElement.width,
            targetWidth: element.width,
          },
        });
      }
      additions.set(check, geometryIssues);
    }
  }
  return checks.map((check) => {
    const addedIssues = additions.get(check) ?? [];
    return {
      ...check,
      geometryIssues: [...check.geometryIssues, ...addedIssues],
      issues: [...check.issues, ...addedIssues.map((issue) => issue.kind)],
    };
  });
};

export const getRenderedImageIssues = (
  layout: Layout
): RenderedAuditCheck["imageIssues"] => {
  const eagerSourcesAboveFold = new Set(
    layout.images.flatMap((image) =>
      image.loading !== "lazy" &&
      image.top < layout.viewportHeight &&
      image.sourcePathname !== undefined
        ? [image.sourcePathname]
        : []
    )
  );
  return layout.images.flatMap((image) => {
    const sourceWidth = image.selectedSourceWidth ?? image.naturalWidth;
    const sourceHeight = image.selectedSourceHeight ?? image.naturalHeight;
    let kind: RenderedAuditCheck["imageIssues"][number]["kind"] | undefined;
    if (
      image.complete &&
      image.naturalWidth === 0 &&
      image.renderedWidth > 0 &&
      image.renderedHeight > 0
    ) {
      kind = "broken-image";
    } else if (
      image.top >= layout.viewportHeight &&
      image.loading !== "lazy" &&
      (image.sourcePathname === undefined ||
        eagerSourcesAboveFold.has(image.sourcePathname) === false)
    ) {
      kind = "eager-below-fold-image";
    } else if (
      image.sourcePathname?.toLowerCase().endsWith(".svg") !== true &&
      image.sourcePathname?.toLowerCase().startsWith("data:image/svg+xml") !==
        true &&
      image.renderedWidth > 0 &&
      image.renderedHeight > 0 &&
      sourceWidth > image.renderedWidth * 2 &&
      sourceHeight > image.renderedHeight * 2
    ) {
      kind = "oversized-image";
    }
    return kind === undefined ? [] : [{ kind, ...image }];
  });
};

export const getRenderedResourceIssues = (
  layout: Layout
): RenderedAuditCheck["resourceIssues"] =>
  layout.resources.flatMap((resource) => {
    const issues: RenderedAuditCheck["resourceIssues"] = [];
    if (
      resource.renderBlockingStatus === "blocking" &&
      /^\/assets\/index-[a-zA-Z0-9_-]+\.css$/.test(resource.pathname) === false
    ) {
      issues.push({ kind: "render-blocking-resource", ...resource });
    }
    if (/\.(?:ttf|otf|woff)$/i.test(resource.pathname)) {
      issues.push({ kind: "legacy-font-format", ...resource });
    }
    return issues;
  });

export const getRenderedContrastIssues = (
  layout: Layout
): NonNullable<RenderedAuditCheck["contrastIssues"]> =>
  layout.contrasts.flatMap((contrast) =>
    contrast.ratio < contrast.requiredRatio
      ? [
          {
            kind: "low-text-contrast" as const,
            confidence: "exact" as const,
            ...contrast,
          },
        ]
      : []
  );

const getRenderedAuditPlan = (
  pagesResult: unknown,
  breakpointsResult: unknown,
  input: RenderedAuditInput,
  performanceEnabled: boolean,
  accessibilityEnabled: boolean
): RenderedAuditPlan => {
  const normalizePagePath = (path: string) => path || "/";
  const candidates =
    isRecord(pagesResult) && Array.isArray(pagesResult.pages)
      ? pagesResult.pages.filter(
          (
            page
          ): page is Record<string, unknown> & { id: string; path: string } =>
            isRecord(page) &&
            typeof page.id === "string" &&
            typeof page.path === "string" &&
            (typeof input.pageId !== "string" || page.id === input.pageId) &&
            (typeof input.pagePath !== "string" ||
              normalizePagePath(page.path) ===
                normalizePagePath(input.pagePath))
        )
      : [];
  const routeExamples = new Map(
    input.routeExamples?.map((example) => [example.pageId, example.path]) ?? []
  );
  const isDynamicRoute = (path: string) =>
    path.includes(":") || path.includes("*");
  const pages = candidates.flatMap((page) => {
    if (isDynamicRoute(page.path) === false) {
      return [{ pageId: page.id, pagePath: normalizePagePath(page.path) }];
    }
    const example = routeExamples.get(page.id);
    return example === undefined
      ? []
      : [{ pageId: page.id, pagePath: example }];
  });
  const excludedPages = candidates
    .filter((page) => isDynamicRoute(page.path) && !routeExamples.has(page.id))
    .map((page) => ({
      pageId: page.id,
      pagePath: normalizePagePath(page.path),
      reason: "dynamic-route-needs-example" as const,
    }));
  const viewports = getRenderedAuditViewports(breakpointsResult);
  return {
    version: 1,
    pages,
    excludedPages,
    viewports,
    checks: [
      "horizontal-overflow",
      ...(performanceEnabled
        ? ([
            "broken-image",
            "eager-below-fold-image",
            "oversized-image",
            "render-blocking-resource",
            "legacy-font-format",
          ] as const)
        : []),
      ...(accessibilityEnabled ? (["low-text-contrast"] as const) : []),
    ],
    captureCount: pages.length * viewports.length,
  };
};

const mergeRenderedAudit = ({
  envelope,
  input,
  checks,
  failures,
  plan,
  generatedBuildMetrics,
}: {
  envelope: ProjectSessionEnvelope;
  input: RenderedAuditInput;
  checks: RenderedAuditCheck[];
  failures: RenderedAuditFailure[];
  plan?: RenderedAuditPlan;
  generatedBuildMetrics?: GeneratedBuildMetrics;
}): ProjectSessionEnvelope => {
  const result = envelope.result;
  if (isRecord(result) === false) {
    return envelope;
  }
  const renderedIssueCount = checks.reduce(
    (count, check) => count + check.issues.length,
    0
  );
  const plannedCaptures =
    plan?.pages.flatMap((page) =>
      plan.viewports.map((viewport) => ({ page, viewport }))
    ) ?? [];
  const captureOrder = new Map(
    plannedCaptures.map(({ page, viewport }, index) => [
      getRenderedAuditCaptureKey(page.pageId, viewport),
      index,
    ])
  );
  const getCaptureOrder = (
    pageId: string | undefined,
    viewport: { width: number; height: number } | undefined
  ) =>
    pageId === undefined || viewport === undefined
      ? Number.MAX_SAFE_INTEGER
      : (captureOrder.get(getRenderedAuditCaptureKey(pageId, viewport)) ??
        Number.MAX_SAFE_INTEGER);
  const orderedChecks = [...checks].sort(
    (left, right) =>
      getCaptureOrder(left.pageId, left.viewport) -
      getCaptureOrder(right.pageId, right.viewport)
  );
  const orderedFailures = [...failures].sort(
    (left, right) =>
      getCaptureOrder(left.pageId, left.viewport) -
      getCaptureOrder(right.pageId, right.viewport)
  );
  const checkByCapture = new Map(
    checks.map((check) => [
      getRenderedAuditCaptureKey(check.pageId, check.viewport),
      check,
    ])
  );
  const failureByCapture = new Map(
    failures.flatMap((failure) =>
      failure.pageId === undefined || failure.viewport === undefined
        ? []
        : [
            [
              getRenderedAuditCaptureKey(failure.pageId, failure.viewport),
              failure,
            ] as const,
          ]
    )
  );
  const fallbackFailure = failures.find(
    (failure) => failure.pageId === undefined || failure.viewport === undefined
  );
  const getFailureStatus = (failure: RenderedAuditFailure | undefined) => {
    if (failure === undefined) {
      return "skipped" as const;
    }
    return failure.code === "RENDERED_AUDIT_CAPTURE_LIMIT_EXCEEDED" ||
      failure.code === "RENDERED_AUDIT_CONFIRMATION_REQUIRED" ||
      failure.code === "RENDERED_AUDIT_CONFIRMATION_INVALID" ||
      failure.code === "RENDERED_AUDIT_CANCELLED"
      ? ("skipped" as const)
      : ("failed" as const);
  };
  const renderedCaptureStatuses =
    plan?.pages.flatMap((page) =>
      plan.viewports.map((viewport) => {
        const check = checkByCapture.get(
          getRenderedAuditCaptureKey(page.pageId, viewport)
        );
        const failure =
          failureByCapture.get(
            getRenderedAuditCaptureKey(page.pageId, viewport)
          ) ?? fallbackFailure;
        if (check !== undefined) {
          return {
            pageId: page.pageId,
            pagePath: page.pagePath,
            viewport: { width: viewport.width, height: viewport.height },
            status:
              check.issues.length === 0
                ? ("passed" as const)
                : ("issues" as const),
            screenshotPath: check.screenshotPath,
          };
        }
        return {
          pageId: page.pageId,
          pagePath: page.pagePath,
          viewport: { width: viewport.width, height: viewport.height },
          status: getFailureStatus(failure),
          ...(failure === undefined ? {} : { failureCode: failure.code }),
          ...(failure?.screenshotPath === undefined
            ? {}
            : { screenshotPath: failure.screenshotPath }),
        };
      })
    ) ?? [];
  const renderedCaptureSummary = renderedCaptureStatuses.reduce(
    (summary, capture) => {
      summary[capture.status] += 1;
      return summary;
    },
    {
      planned: renderedCaptureStatuses.length,
      passed: 0,
      issues: 0,
      skipped: 0,
      failed: 0,
    }
  );
  const isVerbose = input.verbose === true;
  const renderedIssueSummaries = Array.from(
    checks
      .reduce((summaries, check) => {
        for (const kind of new Set(check.issues)) {
          const summary = summaries.get(kind) ?? {
            kind,
            confidence: getRenderedIssueConfidence(kind),
            count: 0,
            captureCount: 0,
            pagePaths: new Set<string>(),
          };
          summary.captureCount += 1;
          summary.pagePaths.add(check.pagePath);
          summaries.set(kind, summary);
        }
        for (const kind of check.issues) {
          const summary = summaries.get(kind);
          if (summary !== undefined) {
            summary.count += 1;
          }
        }
        return summaries;
      }, new Map<RenderedAuditCheck["issues"][number], { kind: RenderedAuditCheck["issues"][number]; confidence: "exact" | "advisory"; count: number; captureCount: number; pagePaths: Set<string> }>())
      .values(),
    ({ pagePaths, ...summary }) => ({
      ...summary,
      pagePaths: Array.from(pagePaths).sort().slice(0, 5),
    })
  ).sort(
    (left, right) =>
      right.count - left.count || left.kind.localeCompare(right.kind)
  );
  const renderedFailureSummaries = Array.from(
    failures
      .reduce((summaries, failure) => {
        const key = `${failure.code}\n${failure.phase}\n${failure.remediation}`;
        const summary = summaries.get(key);
        summaries.set(key, {
          code: failure.code,
          phase: failure.phase,
          remediation: failure.remediation,
          count: (summary?.count ?? 0) + 1,
        });
        return summaries;
      }, new Map<string, { code: RenderedAuditFailure["code"]; phase: RenderedAuditFailure["phase"]; remediation: string; count: number }>())
      .values()
  );
  const manualChecks =
    isVerbose && Array.isArray(result.manualChecks)
      ? result.manualChecks
      : undefined;
  const confirmationRequired =
    failures.length > 0 &&
    failures.every(
      ({ code }) =>
        code === "RENDERED_AUDIT_CONFIRMATION_REQUIRED" ||
        code === "RENDERED_AUDIT_CONFIRMATION_INVALID"
    );
  const renderedState = confirmationRequired
    ? ("confirmation-required" as const)
    : failures.length === 0
      ? ("complete" as const)
      : checks.length === 0
        ? ("failed" as const)
        : ("partial" as const);
  return {
    ...envelope,
    result: {
      ...result,
      renderedCheckCount: checks.length,
      renderedIssueCount,
      renderedFailureCount: failures.length,
      renderedState,
      renderedPlan: plan ?? null,
      renderedCaptureSummary,
      renderedCaptureStatuses,
      generatedBuildSummary:
        generatedBuildMetrics === undefined
          ? null
          : {
              version: generatedBuildMetrics.version,
              fileCount: generatedBuildMetrics.fileCount,
              bytes: generatedBuildMetrics.bytes,
              gzipBytes: generatedBuildMetrics.gzipBytes,
              client: generatedBuildMetrics.client,
              server: generatedBuildMetrics.server,
            },
      manualCheckCount: result.manualCheckCount,
      ...(isVerbose
        ? {
            renderedChecks: orderedChecks,
            renderedFailures: orderedFailures,
            manualChecks: manualChecks ?? [],
            generatedBuildMetrics: generatedBuildMetrics ?? null,
          }
        : { renderedIssueSummaries, renderedFailureSummaries }),
    },
  };
};

export const augmentAuditWithRenderedChecks = async ({
  envelope,
  input,
  executeRead,
  startPreview,
  stopPreview,
  captureScreenshot,
  capturePageScreenshots,
  reportProgress,
  storeRenderedAuditArtifacts,
  timeouts,
  signal,
}: {
  envelope: ProjectSessionEnvelope;
  input: unknown;
  executeRead: ExecuteRead;
  startPreview?: StartPreview;
  stopPreview?: StopPreview;
  captureScreenshot?: CaptureScreenshot;
  capturePageScreenshots?: CapturePageScreenshots;
  reportProgress?: (message: string) => void;
  storeRenderedAuditArtifacts?: StoreRenderedAuditArtifacts;
  timeouts?: Partial<{
    capture: number;
    page: number;
    overall: number;
  }>;
  signal?: AbortSignal;
}): Promise<ProjectSessionEnvelope> => {
  if (
    isRecord(input) === false ||
    input.rendered !== true ||
    startPreview === undefined ||
    stopPreview === undefined ||
    captureScreenshot === undefined ||
    isRecord(envelope.result) === false
  ) {
    return envelope;
  }
  const renderedInput = input as RenderedAuditInput;
  const result = envelope.result;
  const performanceEnabled =
    Array.isArray(result.scopes) && result.scopes.includes("performance");
  const accessibilityEnabled =
    Array.isArray(result.scopes) && result.scopes.includes("accessibility");
  const checks: RenderedAuditCheck[] = [];
  const failures: RenderedAuditFailure[] = [];
  const performance = {
    captureCount: 0,
    previewStartMs: 0,
    captureWallMs: 0,
    previewStopMs: 0,
    targetSetupMs: 0,
    navigationMs: 0,
    readinessMs: 0,
    imageInspectionMs: 0,
    resourceInspectionMs: 0,
    screenshotMs: 0,
    artifactWriteMs: 0,
    targetCleanupMs: 0,
  };
  let generatedBuildMetrics: GeneratedBuildMetrics | undefined;
  let previewOrigin: string | undefined;
  const captureTimeout = timeouts?.capture ?? renderedAuditCaptureTimeout;
  const pageTimeout = timeouts?.page ?? renderedAuditPageTimeout;
  let overallTimeout = getRenderedAuditOverallTimeout(1, timeouts?.overall);
  let plan: RenderedAuditPlan | undefined;
  let cancellationRecorded = false;
  const projectId = envelope.projectId;
  const buildId = envelope.buildId;
  const projectVersion = envelope.version;
  const recordCancellation = (capture?: {
    page: RenderedAuditPlan["pages"][number];
    viewport: Viewport;
  }) => {
    if (cancellationRecorded) {
      return;
    }
    cancellationRecorded = true;
    failures.push({
      code: "RENDERED_AUDIT_CANCELLED",
      phase: capture === undefined ? "planning" : "capture",
      retryable: true,
      remediation:
        "Retry the rendered audit. Completed capture evidence remains available in the artifact manifest.",
      ...(capture === undefined
        ? {}
        : {
            pageId: capture.page.pageId,
            pagePath: capture.page.pagePath,
            viewport: {
              width: capture.viewport.width,
              height: capture.viewport.height,
            },
          }),
      message: "Rendered audit was cancelled by the caller.",
    });
  };
  const finish = async () => {
    const completedChecks = addCrossBreakpointGeometryIssues(checks);
    let merged = mergeRenderedAudit({
      envelope,
      input: renderedInput,
      checks: completedChecks,
      failures,
      plan,
      generatedBuildMetrics,
    });
    if (
      plan !== undefined &&
      storeRenderedAuditArtifacts !== undefined &&
      typeof projectId === "string" &&
      typeof buildId === "string" &&
      typeof projectVersion === "number" &&
      isRecord(merged.result)
    ) {
      try {
        reportProgress?.("tool audit storing rendered artifact manifest");
        const path = await storeRenderedAuditArtifacts({
          version: renderedAuditManifestVersion,
          auditContractVersion,
          projectId,
          buildId,
          projectVersion,
          plan,
          captureStatuses: Array.isArray(merged.result.renderedCaptureStatuses)
            ? merged.result.renderedCaptureStatuses
            : [],
          checks: completedChecks,
          failures: [...failures],
          screenshot: {
            format: "webp",
            quality: 82,
            scale: 0.5,
          },
          performance: { ...performance },
          generatedBuildMetrics: generatedBuildMetrics ?? null,
        });
        const screenshotCount = new Set([
          ...completedChecks.map((check) => check.screenshotPath),
          ...failures.flatMap((failure) =>
            failure.screenshotPath === undefined ? [] : [failure.screenshotPath]
          ),
        ]).size;
        merged = {
          ...merged,
          result: {
            ...merged.result,
            renderedArtifactManifest: {
              version: renderedAuditManifestVersion,
              path,
              screenshotCount,
            },
          },
        };
      } catch (error) {
        failures.push({
          code: "RENDERED_AUDIT_ARTIFACT_WRITE_FAILED",
          phase: "capture",
          retryable: true,
          remediation:
            "Verify that the project .webstudio directory is writable, then retry the rendered audit.",
          message: `Rendered audit could not store its artifact manifest: ${error instanceof Error ? error.message : String(error)}`,
        });
        merged = mergeRenderedAudit({
          envelope,
          input: renderedInput,
          checks: completedChecks,
          failures,
          plan,
          generatedBuildMetrics,
        });
      }
    }
    return merged;
  };

  reportProgress?.("tool audit preparing rendered responsive checks");
  let pagesEnvelope: ProjectSessionEnvelope;
  let breakpointsEnvelope: ProjectSessionEnvelope;
  try {
    [pagesEnvelope, breakpointsEnvelope] = await Promise.all([
      readAllPaginatedItems(executeRead, "list-pages", "pages"),
      readAllPaginatedItems(executeRead, "list-breakpoints", "breakpoints"),
    ]);
  } catch (error) {
    failures.push({
      code: "RENDERED_AUDIT_PREPARATION_FAILED",
      phase: "planning",
      retryable: true,
      remediation:
        "Refresh the project session and retry. If the failure persists, inspect list-pages and list-breakpoints separately.",
      message: `Rendered audit could not prepare: ${error instanceof Error ? error.message : String(error)}`,
    });
    return await finish();
  }

  plan = getRenderedAuditPlan(
    pagesEnvelope.result,
    breakpointsEnvelope.result,
    renderedInput,
    performanceEnabled,
    accessibilityEnabled
  );
  reportProgress?.(
    `tool audit progress ${JSON.stringify({
      phase: "planned",
      pages: plan.pages.length,
      viewports: plan.viewports.length,
      captures: plan.captureCount,
    })}`
  );
  if (plan.pages.length === 0) {
    failures.push({
      code: "RENDERED_AUDIT_NO_STATIC_PAGES",
      phase: "planning",
      retryable: false,
      remediation:
        "Choose an existing static pagePath or pageId. Dynamic routes require a concrete route example.",
      message: "Rendered audit found no static page paths to capture.",
    });
    return await finish();
  }

  if (signal?.aborted) {
    recordCancellation();
    return await finish();
  }

  const captureCount = plan.captureCount;
  overallTimeout = getRenderedAuditOverallTimeout(
    captureCount,
    timeouts?.overall
  );
  if (captureCount > maxRenderedAuditCaptures) {
    const signature = getRenderedAuditPlanSignature({
      envelope,
      input: renderedInput,
      plan,
    });
    if (
      renderedInput.confirmLargeRun !== true ||
      (await validateRenderedAuditConfirmation(
        renderedInput.confirmationToken,
        signature
      )) === false
    ) {
      const confirmation = await createRenderedAuditConfirmation(signature);
      plan = {
        ...plan,
        confirmationToken: confirmation.token,
        confirmationExpiresAt: new Date(confirmation.expiresAt).toISOString(),
      };
      failures.push({
        code:
          renderedInput.confirmLargeRun === true
            ? "RENDERED_AUDIT_CONFIRMATION_INVALID"
            : "RENDERED_AUDIT_CONFIRMATION_REQUIRED",
        phase: "planning",
        retryable: false,
        remediation:
          "Review the returned rendered plan, then retry the unchanged audit with confirmLargeRun: true and its confirmationToken before the token expires.",
        message:
          `Rendered audit requires ${captureCount} screenshots, exceeding the ` +
          `${maxRenderedAuditCaptures}-screenshot unconfirmed threshold.`,
      });
      return await finish();
    }
  }

  const previewStartStartedAt = Date.now();
  try {
    const previewResult = await startPreview(
      {
        source: "session",
        port: automaticPreviewPort,
        imageDomains: renderedInput.imageDomains,
      },
      { report: (message) => reportProgress?.(message) }
    );
    const previewUrl = new URL(previewResult.url);
    if (previewUrl.hostname !== "127.0.0.1") {
      throw new Error(
        `Rendered audit preview must use 127.0.0.1, received ${previewUrl.origin}.`
      );
    }
    previewOrigin = previewUrl.origin;
    const parsedGeneratedBuildMetrics = generatedBuildMetricsSchema.safeParse(
      isRecord(previewResult) ? previewResult.generatedBuildMetrics : undefined
    );
    if (parsedGeneratedBuildMetrics.success) {
      generatedBuildMetrics = parsedGeneratedBuildMetrics.data;
    }
    performance.previewStartMs = Date.now() - previewStartStartedAt;
  } catch (error) {
    performance.previewStartMs = Date.now() - previewStartStartedAt;
    failures.push({
      code: "RENDERED_AUDIT_PREVIEW_START_FAILED",
      phase: "preview-start",
      retryable: true,
      remediation:
        "Run preview.start separately to inspect the generated build failure, fix it, then retry the rendered audit.",
      message: `Rendered audit could not start: ${error instanceof Error ? error.message : String(error)}`,
    });
    return await finish();
  }

  const captureStartedAt = Date.now();
  try {
    const captures = plan.pages.flatMap((page) =>
      plan.viewports.map((viewport) => ({ page, viewport }))
    );
    const overallDeadline = Date.now() + overallTimeout;
    const resizedScreenshots = new Map<
      string,
      ProjectSessionScreenshotResult
    >();
    const terminalCaptureKeys = new Set<string>();
    if (capturePageScreenshots !== undefined) {
      const capturePageBatch = async (
        pages: RenderedAuditPlan["pages"]
      ): Promise<void> => {
        if (signal?.aborted) {
          recordCancellation();
          return;
        }
        const batchCaptures = pages.flatMap((page) =>
          plan.viewports.map((viewport) => ({ page, viewport }))
        );
        const inputs = batchCaptures.map(({ page, viewport }) =>
          getRenderedAuditScreenshotInput({
            pageId: page.pageId,
            pagePath: page.pagePath,
            viewport,
            performanceEnabled,
            accessibilityEnabled,
          })
        );
        try {
          const screenshots = await withRenderedAuditCancellation(
            withRenderedAuditCaptureTimeout(
              capturePageScreenshots(inputs),
              Math.min(overallTimeout, pageTimeout * pages.length)
            ),
            signal
          );
          if (screenshots.length !== batchCaptures.length) {
            throw new Error(
              `Resized capture returned ${screenshots.length} of ${batchCaptures.length} viewport results.`
            );
          }
          for (const [index, screenshot] of screenshots.entries()) {
            const capture = batchCaptures[index];
            if (capture !== undefined) {
              resizedScreenshots.set(
                getRenderedAuditCaptureKey(
                  capture.page.pageId,
                  capture.viewport
                ),
                screenshot
              );
            }
          }
        } catch (error) {
          if (error instanceof RenderedAuditCancelledError) {
            const capture = batchCaptures[0];
            capture === undefined
              ? recordCancellation()
              : recordCancellation(capture);
            return;
          }
          if (error instanceof RenderedAuditCaptureTimeoutError) {
            for (const capture of batchCaptures) {
              const viewport = {
                width: capture.viewport.width,
                height: capture.viewport.height,
              };
              terminalCaptureKeys.add(
                getRenderedAuditCaptureKey(
                  capture.page.pageId,
                  capture.viewport
                )
              );
              failures.push({
                code: "RENDERED_AUDIT_CAPTURE_TIMEOUT",
                phase: "capture",
                retryable: true,
                remediation:
                  "Audit this page alone and inspect its navigation/readiness behavior before retrying the full run.",
                pageId: capture.page.pageId,
                pagePath: capture.page.pagePath,
                viewport,
                message: error.message,
              });
            }
            return;
          }
          reportProgress?.(
            `tool audit resized capture failed for ${pages[0]?.pagePath}; retrying its viewports with fresh navigation`
          );
        }
      };
      let nextPage = 0;
      const captureNextPage = async (): Promise<void> => {
        while (true) {
          const page = plan.pages[nextPage];
          nextPage += 1;
          if (page === undefined) {
            return;
          }
          await capturePageBatch([page]);
        }
      };
      await Promise.all(
        Array.from(
          {
            length: Math.min(
              renderedAuditCaptureConcurrency,
              plan.pages.length
            ),
          },
          captureNextPage
        )
      );
    }
    const pageStartedAt = new Map<string, number>();
    let nextCapture = 0;
    let completedCaptures = 0;
    let lastReportedMilestone = 0;
    const reportCaptureComplete = () => {
      completedCaptures += 1;
      const milestone = Math.floor(
        (completedCaptures / Math.max(1, captures.length)) * 10
      );
      if (milestone <= lastReportedMilestone && completedCaptures > 1) {
        return;
      }
      lastReportedMilestone = milestone;
      reportProgress?.(
        `tool audit progress ${JSON.stringify({
          phase: "capture",
          completed: completedCaptures,
          total: captures.length,
        })}`
      );
    };
    const captureNext = async (): Promise<void> => {
      while (true) {
        if (signal?.aborted) {
          recordCancellation();
          return;
        }
        const capture = captures[nextCapture];
        nextCapture += 1;
        if (capture === undefined) {
          return;
        }
        const { page, viewport } = capture;
        if (
          terminalCaptureKeys.has(
            getRenderedAuditCaptureKey(page.pageId, viewport)
          )
        ) {
          reportCaptureComplete();
          continue;
        }
        const pagePath = page.pagePath;
        const viewportSize = { width: viewport.width, height: viewport.height };
        const now = Date.now();
        const pageStart = pageStartedAt.get(page.pageId) ?? now;
        pageStartedAt.set(page.pageId, pageStart);
        if (now > overallDeadline) {
          failures.push({
            code: "RENDERED_AUDIT_OVERALL_TIMEOUT",
            phase: "capture",
            retryable: true,
            remediation:
              "Run a focused page audit or reduce the viewport plan, then retry the remaining pages.",
            pageId: page.pageId,
            pagePath,
            viewport: viewportSize,
            message: `Rendered audit exceeded its ${overallTimeout}ms overall timeout.`,
          });
          reportCaptureComplete();
          continue;
        }
        if (now - pageStart > pageTimeout) {
          failures.push({
            code: "RENDERED_AUDIT_PAGE_TIMEOUT",
            phase: "capture",
            retryable: true,
            remediation:
              "Audit this page alone and inspect slow resources or readiness behavior before retrying the full run.",
            pageId: page.pageId,
            pagePath,
            viewport: viewportSize,
            message: `Rendered page audit exceeded its ${pageTimeout}ms timeout.`,
          });
          reportCaptureComplete();
          continue;
        }
        try {
          const screenshot =
            resizedScreenshots.get(
              getRenderedAuditCaptureKey(page.pageId, viewport)
            ) ??
            (await withRenderedAuditCancellation(
              withRenderedAuditCaptureTimeout(
                captureScreenshot(
                  getRenderedAuditScreenshotInput({
                    pageId: page.pageId,
                    pagePath,
                    viewport: viewportSize,
                    performanceEnabled,
                    accessibilityEnabled,
                  })
                ),
                captureTimeout
              ),
              signal
            ));
          performance.captureCount += 1;
          if (screenshot.timings !== undefined) {
            for (const key of [
              "targetSetupMs",
              "navigationMs",
              "readinessMs",
              "imageInspectionMs",
              "resourceInspectionMs",
              "screenshotMs",
              "artifactWriteMs",
              "targetCleanupMs",
            ] as const) {
              performance[key] += screenshot.timings[key];
            }
          }
          if (screenshot.layout === undefined) {
            failures.push({
              code: "RENDERED_AUDIT_LAYOUT_METRICS_MISSING",
              phase: "capture",
              retryable: true,
              remediation:
                "Retry the page capture. If layout metrics remain absent, verify the screenshot browser and generated page readiness.",
              pageId: page.pageId,
              pagePath,
              viewport: viewportSize,
              message: "Screenshot did not return rendered layout metrics.",
            });
            reportCaptureComplete();
            continue;
          }
          if (screenshot.navigation === undefined) {
            failures.push({
              code: "RENDERED_AUDIT_NAVIGATION_EVIDENCE_MISSING",
              phase: "capture",
              retryable: true,
              remediation:
                "Retry with a current Chromium-family browser and CLI that reports top-level navigation evidence.",
              pageId: page.pageId,
              pagePath,
              viewport: viewportSize,
              screenshotPath: screenshot.output,
              message:
                "Screenshot did not report its final URL, HTTP status, redirects, and readiness evidence.",
            });
            reportCaptureComplete();
            continue;
          }
          const finalUrl = new URL(screenshot.navigation.finalUrl);
          if (finalUrl.origin !== previewOrigin) {
            failures.push({
              code: "RENDERED_AUDIT_ORIGIN_MISMATCH",
              phase: "capture",
              retryable: false,
              remediation:
                "Stop conflicting local servers and retry so the audit captures only its owned generated preview.",
              pageId: page.pageId,
              pagePath,
              viewport: viewportSize,
              screenshotPath: screenshot.output,
              message: `Expected the owned generated preview origin, but captured ${finalUrl.origin}.`,
            });
            reportCaptureComplete();
            continue;
          }
          const requestedUrl = new URL(pagePath, finalUrl.origin);
          const requestedRoute = `${requestedUrl.pathname}${requestedUrl.search}`;
          const finalRoute = `${finalUrl.pathname}${finalUrl.search}`;
          if (
            finalRoute !== requestedRoute &&
            screenshot.navigation.redirects.includes(
              requestedUrl.toString()
            ) === false
          ) {
            failures.push({
              code: "RENDERED_AUDIT_ROUTE_MISMATCH",
              phase: "capture",
              retryable: false,
              remediation:
                "Inspect generated redirects and route definitions, then provide the canonical concrete page path.",
              pageId: page.pageId,
              pagePath,
              viewport: viewportSize,
              screenshotPath: screenshot.output,
              message: `Requested ${requestedRoute}, but the generated preview finished at ${finalRoute}.`,
            });
            reportCaptureComplete();
            continue;
          }
          if (
            screenshot.navigation.status !== undefined &&
            screenshot.navigation.status >= 400
          ) {
            failures.push({
              code: "RENDERED_AUDIT_HTTP_ERROR",
              phase: "capture",
              retryable: false,
              remediation:
                "Verify that the generated project defines this route and that the preview server can render it.",
              pageId: page.pageId,
              pagePath,
              viewport: viewportSize,
              screenshotPath: screenshot.output,
              message: `Generated preview returned HTTP ${screenshot.navigation.status} for ${screenshot.navigation.finalUrl}.`,
            });
            reportCaptureComplete();
            continue;
          }
          const isHtmlDocument =
            screenshot.layout.documentType === "text/html" ||
            screenshot.layout.documentType === "application/xhtml+xml";
          if (
            isHtmlDocument &&
            screenshot.navigation.generatedSiteRootPresent === false
          ) {
            failures.push({
              code: "RENDERED_AUDIT_DOCUMENT_NOT_GENERATED_SITE",
              phase: "capture",
              retryable: false,
              remediation:
                "Verify that the capture uses the owned generated preview rather than a Builder/share URL or unrelated server.",
              pageId: page.pageId,
              pagePath,
              viewport: viewportSize,
              screenshotPath: screenshot.output,
              message: `Captured ${screenshot.navigation.finalUrl} without a generated Webstudio page marker.`,
            });
            reportCaptureComplete();
            continue;
          }
          if (screenshot.navigation.layoutStable === false) {
            failures.push({
              code: "RENDERED_AUDIT_LAYOUT_UNSTABLE",
              phase: "capture",
              retryable: true,
              remediation:
                "Retry after the page finishes loading, or provide a readiness selector for asynchronously rendered content.",
              pageId: page.pageId,
              pagePath,
              viewport: viewportSize,
              screenshotPath: screenshot.output,
              message: `Captured ${screenshot.navigation.finalUrl} before its layout stabilized.`,
            });
            reportCaptureComplete();
            continue;
          }
          const layout: GeometryLayout = {
            ...screenshot.layout,
            navigation: screenshot.navigation,
            elementGeometry:
              "elementGeometry" in screenshot.layout &&
              isRecord(screenshot.layout.elementGeometry)
                ? (screenshot.layout
                    .elementGeometry as GeometryLayout["elementGeometry"])
                : emptyElementGeometry,
            images: screenshot.layout.images ?? [],
            resources: screenshot.layout.resources ?? [],
            contrasts: screenshot.layout.contrasts ?? [],
          };
          const imageIssues = performanceEnabled
            ? getRenderedImageIssues(layout)
            : [];
          const resourceIssues = performanceEnabled
            ? getRenderedResourceIssues(layout)
            : [];
          const geometryIssues = getRenderedGeometryIssues(layout);
          const contrastIssues = accessibilityEnabled
            ? getRenderedContrastIssues(layout)
            : [];
          checks.push({
            pageId: page.pageId,
            pagePath,
            viewport: viewportSize,
            screenshotPath: screenshot.output,
            layout,
            issues: [
              ...(layout.horizontalOverflow
                ? (["horizontal-overflow"] as const)
                : []),
              ...geometryIssues.map((issue) => issue.kind),
              ...imageIssues.map((issue) => issue.kind),
              ...resourceIssues.map((issue) => issue.kind),
              ...contrastIssues.map((issue) => issue.kind),
            ],
            geometryIssues,
            imageIssues,
            resourceIssues,
            contrastIssues,
          });
        } catch (error) {
          if (error instanceof RenderedAuditCancelledError) {
            recordCancellation(capture);
            reportCaptureComplete();
            return;
          }
          failures.push({
            code:
              error instanceof RenderedAuditCaptureTimeoutError
                ? "RENDERED_AUDIT_CAPTURE_TIMEOUT"
                : "RENDERED_AUDIT_SCREENSHOT_FAILED",
            phase: "capture",
            retryable: true,
            remediation:
              error instanceof RenderedAuditCaptureTimeoutError
                ? "Audit this page alone and inspect its navigation/readiness behavior before retrying the full run."
                : "Capture this page and viewport with the screenshot tool to inspect browser startup, navigation, or readiness errors, then retry.",
            pageId: page.pageId,
            pagePath,
            viewport: viewportSize,
            message: error instanceof Error ? error.message : String(error),
          });
        }
        reportCaptureComplete();
      }
    };
    await Promise.all(
      Array.from(
        { length: Math.min(renderedAuditCaptureConcurrency, captures.length) },
        captureNext
      )
    );
  } finally {
    performance.captureWallMs = Date.now() - captureStartedAt;
    const previewStopStartedAt = Date.now();
    try {
      await stopPreview();
    } catch (error) {
      failures.push({
        code: "RENDERED_AUDIT_PREVIEW_STOP_FAILED",
        phase: "preview-stop",
        retryable: true,
        remediation:
          "Run preview.status and preview.stop in the same MCP session before retrying.",
        message: `Rendered audit could not stop its preview: ${error instanceof Error ? error.message : String(error)}`,
      });
    } finally {
      performance.previewStopMs = Date.now() - previewStopStartedAt;
    }
  }
  return await finish();
};

export const __testing__ = {
  addCrossBreakpointGeometryIssues,
  mergeRenderedAudit,
};
