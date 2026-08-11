import type {
  BrowserScreenshotContrast,
  BrowserScreenshotElementGeometry,
  BrowserScreenshotImage,
  BrowserScreenshotResource,
} from "./screenshot-browser-cdp";

export type ScreenshotGeometryIssue =
  | {
      kind: "clipped-content";
      instanceId: string;
      clippedX: boolean;
      clippedY: boolean;
    }
  | {
      kind: "overlapping-elements";
      instanceId: string;
      relatedInstanceId: string;
    }
  | {
      kind: "hidden-content";
      instanceId: string;
      hiddenReason?: "display" | "visibility" | "opacity" | "hidden";
    }
  | {
      kind: "cross-viewport-layout-change";
      instanceId: string;
      sourceViewportWidth: number;
      targetViewportWidth: number;
      sourceVisible: boolean;
      targetVisible: boolean;
      sourceX: number;
      targetX: number;
      sourceWidth: number;
      targetWidth: number;
    };

export type ScreenshotImageIssue = BrowserScreenshotImage & {
  kind: "broken-image" | "eager-below-fold-image" | "oversized-image";
};

export type ScreenshotResourceIssue = BrowserScreenshotResource & {
  kind: "render-blocking-resource" | "legacy-font-format";
};

export type ScreenshotContrastIssue = BrowserScreenshotContrast & {
  kind: "low-text-contrast";
};

export const findGeometryIssues = (
  geometry: BrowserScreenshotElementGeometry
): ScreenshotGeometryIssue[] => {
  const issues: ScreenshotGeometryIssue[] = [];
  const overlapPairs = new Set<string>();
  for (const element of geometry.elements) {
    if (element.clippedX || element.clippedY) {
      issues.push({
        kind: "clipped-content",
        instanceId: element.instanceId,
        clippedX: element.clippedX,
        clippedY: element.clippedY,
      });
    }
    for (const relatedInstanceId of element.overlapsWith) {
      const [instanceId, pairedInstanceId] = [
        element.instanceId,
        relatedInstanceId,
      ].sort((left, right) => left.localeCompare(right));
      if (instanceId === pairedInstanceId) {
        continue;
      }
      const pair = JSON.stringify([instanceId, pairedInstanceId]);
      if (overlapPairs.has(pair)) {
        continue;
      }
      overlapPairs.add(pair);
      issues.push({
        kind: "overlapping-elements",
        instanceId,
        relatedInstanceId: pairedInstanceId,
      });
    }
  }
  return issues;
};

export const findCrossViewportGeometryIssues = <
  Capture extends {
    viewportWidth: number;
    elementGeometry: BrowserScreenshotElementGeometry;
  },
>(
  captures: readonly Capture[],
  {
    maximumNormalizedXChange = 0.35,
    maximumNormalizedWidthChange = 0.6,
  }: {
    maximumNormalizedXChange?: number;
    maximumNormalizedWidthChange?: number;
  } = {}
) => {
  const issues = new Map<Capture, ScreenshotGeometryIssue[]>(
    captures.map((capture) => [capture, []])
  );
  const ordered = [...captures].sort(
    (left, right) => left.viewportWidth - right.viewportWidth
  );
  const elementsByCapture = ordered.map(
    ({ elementGeometry }) =>
      new Map(
        elementGeometry.elements.map((element) => [element.instanceId, element])
      )
  );
  const firstCapture = ordered[0];
  const firstElements = elementsByCapture[0];
  if (firstCapture !== undefined && firstElements !== undefined) {
    const firstIssues = issues.get(firstCapture) ?? [];
    for (const [instanceId, element] of firstElements) {
      if (
        elementsByCapture.every(
          (elements) => elements.get(instanceId)?.visible === false
        )
      ) {
        firstIssues.push({
          kind: "hidden-content",
          instanceId,
          hiddenReason: element.hiddenReason,
        });
      }
    }
    issues.set(firstCapture, firstIssues);
  }
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];
    const previousElements = elementsByCapture[index - 1];
    if (
      previous === undefined ||
      current === undefined ||
      previousElements === undefined
    ) {
      continue;
    }
    const currentIssues = issues.get(current) ?? [];
    for (const element of current.elementGeometry.elements) {
      const previousElement = previousElements.get(element.instanceId);
      if (previousElement === undefined) {
        continue;
      }
      const normalizedXChange = Math.abs(
        previousElement.x / previous.viewportWidth -
          element.x / current.viewportWidth
      );
      const normalizedWidthChange = Math.abs(
        previousElement.width / previous.viewportWidth -
          element.width / current.viewportWidth
      );
      const overlapChanged =
        [...previousElement.overlapsWith].sort().join("\n") !==
        [...element.overlapsWith].sort().join("\n");
      if (
        previousElement.visible === element.visible &&
        normalizedXChange <= maximumNormalizedXChange &&
        normalizedWidthChange <= maximumNormalizedWidthChange &&
        overlapChanged === false
      ) {
        continue;
      }
      currentIssues.push({
        kind: "cross-viewport-layout-change",
        instanceId: element.instanceId,
        sourceViewportWidth: previous.viewportWidth,
        targetViewportWidth: current.viewportWidth,
        sourceVisible: previousElement.visible,
        targetVisible: element.visible,
        sourceX: previousElement.x,
        targetX: element.x,
        sourceWidth: previousElement.width,
        targetWidth: element.width,
      });
    }
    issues.set(current, currentIssues);
  }
  return issues;
};

export const findImageIssues = ({
  images,
  viewportHeight,
  oversizedScale = 2,
}: {
  images: readonly BrowserScreenshotImage[];
  viewportHeight: number;
  oversizedScale?: number;
}): ScreenshotImageIssue[] => {
  const eagerSourcesAboveFold = new Set(
    images.flatMap((image) =>
      image.loading !== "lazy" &&
      image.top < viewportHeight &&
      image.sourcePathname !== undefined
        ? [image.sourcePathname]
        : []
    )
  );
  return images.flatMap((image) => {
    const sourceWidth = image.selectedSourceWidth ?? image.naturalWidth;
    const sourceHeight = image.selectedSourceHeight ?? image.naturalHeight;
    let kind: ScreenshotImageIssue["kind"] | undefined;
    if (
      image.complete &&
      image.naturalWidth === 0 &&
      image.renderedWidth > 0 &&
      image.renderedHeight > 0
    ) {
      kind = "broken-image";
    } else if (
      image.top >= viewportHeight &&
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
      sourceWidth > image.renderedWidth * oversizedScale &&
      sourceHeight > image.renderedHeight * oversizedScale
    ) {
      kind = "oversized-image";
    }
    return kind === undefined ? [] : [{ kind, ...image }];
  });
};

export const findResourceIssues = (
  resources: readonly BrowserScreenshotResource[],
  {
    ignoreRenderBlocking,
  }: {
    ignoreRenderBlocking?: (resource: BrowserScreenshotResource) => boolean;
  } = {}
): ScreenshotResourceIssue[] =>
  resources.flatMap((resource) => {
    const issues: ScreenshotResourceIssue[] = [];
    if (
      resource.renderBlockingStatus === "blocking" &&
      ignoreRenderBlocking?.(resource) !== true
    ) {
      issues.push({ kind: "render-blocking-resource", ...resource });
    }
    const pathname = resource.pathname.toLowerCase();
    if (
      pathname.endsWith(".ttf") ||
      pathname.endsWith(".otf") ||
      pathname.endsWith(".woff")
    ) {
      issues.push({ kind: "legacy-font-format", ...resource });
    }
    return issues;
  });

export const findContrastIssues = (
  contrasts: readonly BrowserScreenshotContrast[]
): ScreenshotContrastIssue[] =>
  contrasts.flatMap((contrast) =>
    contrast.ratio < contrast.requiredRatio
      ? [{ kind: "low-text-contrast" as const, ...contrast }]
      : []
  );
