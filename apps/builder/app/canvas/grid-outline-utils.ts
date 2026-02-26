import {
  $instances,
  $isResizingCanvas,
  $stylesIndex,
  $propValuesByInstanceSelectorWithMemoryProps,
} from "~/shared/nano-states";
import { $gridCellData, type GridCellData } from "~/shared/nano-states";
import { subscribeScrollState } from "~/canvas/shared/scroll-state";
import { subscribeWindowResize } from "~/shared/dom-hooks";
import type { InstanceSelector } from "~/shared/tree-utils";
import { $awareness } from "~/shared/awareness";
import { getElementByInstanceSelector } from "~/shared/dom-utils";
import { parseGridTemplateTrackList } from "@webstudio-is/css-data";

const hideGridOverlay = () => {
  $gridCellData.set(undefined);
};

const MAX_TRACKS = 20;

// Read resolved CSS strings from getComputedStyle. No DOM probing needed —
// the builder overlay mirrors the grid via a child div that faithfully
// reproduces the canvas element's CSS (including user transforms).
// A parent wrapper handles our scale + translate positioning.
// Inflation is handled at the track level (minmax in inflator.ts), so
// resolved templates are always non-zero for inflated grids.

// Recover the untransformed top-left position from the post-transform AABB.
// getBoundingClientRect() returns the axis-aligned bounding box after
// transforms. We compute where each corner of the untransformed box maps
// to under the transform matrix, find the min x/y, and subtract from the
// AABB origin to recover the pre-transform top-left.
const getUntransformedRect = (
  element: HTMLElement,
  computedStyle: CSSStyleDeclaration
): { top: number; left: number; width: number; height: number } => {
  const width = element.offsetWidth;
  const height = element.offsetHeight;
  const bcr = element.getBoundingClientRect();
  const transformStr = computedStyle.transform;

  if (transformStr === "none" || transformStr === "") {
    return { top: bcr.top, left: bcr.left, width, height };
  }

  const matrix = new DOMMatrix(transformStr);
  const originParts = computedStyle.transformOrigin.split(" ");
  const ox = parseFloat(originParts[0]) || 0;
  const oy = parseFloat(originParts[1]) || 0;

  // Transform each border-box corner relative to the transform origin
  const corners = [
    [0, 0],
    [width, 0],
    [width, height],
    [0, height],
  ];
  let minX = Infinity;
  let minY = Infinity;
  for (const [cx, cy] of corners) {
    const dx = cx - ox;
    const dy = cy - oy;
    const tx = ox + matrix.a * dx + matrix.c * dy + matrix.e;
    const ty = oy + matrix.b * dx + matrix.d * dy + matrix.f;
    minX = Math.min(minX, tx);
    minY = Math.min(minY, ty);
  }

  // BCR.left = untransformedLeft + minX
  return { top: bcr.top - minY, left: bcr.left - minX, width, height };
};

const computeGridCells = (
  gridElement: HTMLElement,
  instanceId: string
): GridCellData | undefined => {
  const computedStyle = window.getComputedStyle(gridElement);
  const display = computedStyle.display;

  if (display !== "grid" && display !== "inline-grid") {
    return;
  }

  const columnTracks = parseGridTemplateTrackList(
    computedStyle.gridTemplateColumns
  );
  const rowTracks = parseGridTemplateTrackList(computedStyle.gridTemplateRows);

  const columnCount = Math.min(Math.max(1, columnTracks.length), MAX_TRACKS);
  const rowCount = Math.min(Math.max(1, rowTracks.length), MAX_TRACKS);

  const rect = getUntransformedRect(gridElement, computedStyle);

  if (rect.width < 1 || rect.height < 1) {
    return;
  }

  return {
    instanceId,
    columnCount,
    rowCount,
    rect,
    resolvedDisplay: display,
    resolvedWidth: computedStyle.width,
    resolvedHeight: computedStyle.height,
    resolvedBoxSizing: computedStyle.boxSizing,
    resolvedColumnTemplate: computedStyle.gridTemplateColumns,
    resolvedRowTemplate: computedStyle.gridTemplateRows,
    resolvedColumnGap: computedStyle.columnGap,
    resolvedRowGap: computedStyle.rowGap,
    resolvedPadding: `${parseFloat(computedStyle.paddingTop) || 0}px ${parseFloat(computedStyle.paddingRight) || 0}px ${parseFloat(computedStyle.paddingBottom) || 0}px ${parseFloat(computedStyle.paddingLeft) || 0}px`,
    resolvedBorderWidth: `${parseFloat(computedStyle.borderTopWidth) || 0}px ${parseFloat(computedStyle.borderRightWidth) || 0}px ${parseFloat(computedStyle.borderBottomWidth) || 0}px ${parseFloat(computedStyle.borderLeftWidth) || 0}px`,
    resolvedBorderStyle: computedStyle.borderStyle,
    resolvedDirection: computedStyle.direction,
    resolvedGridTemplateAreas: computedStyle.gridTemplateAreas,
    resolvedJustifyContent: computedStyle.justifyContent,
    resolvedJustifyItems: computedStyle.justifyItems,
    resolvedAlignContent: computedStyle.alignContent,
    resolvedTransform: computedStyle.transform,
    resolvedTransformOrigin: computedStyle.transformOrigin,
  };
};

const findGridContainer = (
  instanceSelector: Readonly<InstanceSelector>
): { element: HTMLElement; instanceId: string } | undefined => {
  // Check each ancestor in the selector
  for (let i = 0; i < instanceSelector.length; i++) {
    const ancestorSelector = instanceSelector.slice(i);
    const element = getElementByInstanceSelector(ancestorSelector);

    if (element) {
      const computedStyle = window.getComputedStyle(element);
      const display = computedStyle.display;

      if (display === "grid" || display === "inline-grid") {
        return { element, instanceId: instanceSelector[i] };
      }
    }
  }

  return undefined;
};

const subscribeGridOverlay = (
  selectedInstanceSelector: Readonly<InstanceSelector>
) => {
  if (selectedInstanceSelector.length === 0) {
    hideGridOverlay();
    return;
  }

  let rafId = 0;

  // Re-evaluate findGridContainer on every update so that the overlay
  // appears as soon as an element becomes a grid (e.g. display changed
  // from block → grid) without requiring a re-selection.
  const updateGridOverlay = () => {
    if ($isResizingCanvas.get()) {
      hideGridOverlay();
      return;
    }

    const gridInfo = findGridContainer(selectedInstanceSelector);
    if (!gridInfo) {
      hideGridOverlay();
      return;
    }

    const cellData = computeGridCells(gridInfo.element, gridInfo.instanceId);
    $gridCellData.set(cellData);
  };

  // Schedule an update after styles are applied to the DOM.
  // The stylesheet renderer uses rAF, so we need rAF→rAF to ensure
  // both the CSS is written and layout is recalculated.
  const scheduleUpdate = () => {
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      rafId = requestAnimationFrame(() => {
        updateGridOverlay();
      });
    });
  };

  // Initial computation
  updateGridOverlay();

  const unsubscribeStylesIndex = $stylesIndex.subscribe(() => {
    scheduleUpdate();
  });

  const unsubscribeInstances = $instances.subscribe(() => {
    scheduleUpdate();
  });

  const unsubscribePropValues =
    $propValuesByInstanceSelectorWithMemoryProps.subscribe(() => {
      scheduleUpdate();
    });

  const unsubscribeIsResizing = $isResizingCanvas.subscribe((isResizing) => {
    if (isResizing) {
      hideGridOverlay();
    } else {
      updateGridOverlay();
    }
  });

  const unsubscribeScrollState = subscribeScrollState({
    onScrollStart: hideGridOverlay,
    onScrollEnd: updateGridOverlay,
  });

  const unsubscribeWindowResize = subscribeWindowResize({
    onResizeStart: hideGridOverlay,
    onResizeEnd: updateGridOverlay,
  });

  return () => {
    cancelAnimationFrame(rafId);
    hideGridOverlay();
    unsubscribeStylesIndex();
    unsubscribeInstances();
    unsubscribePropValues();
    unsubscribeIsResizing();
    unsubscribeScrollState();
    unsubscribeWindowResize();
  };
};

export const subscribeGridOverlayOnSelected = () => {
  let previousSelectedInstance: readonly string[] | undefined = undefined;
  let unsubscribeGridOverlay = () => {};

  const unsubscribe = $awareness.subscribe((awareness) => {
    const instanceSelector = awareness?.instanceSelector;
    if (instanceSelector !== previousSelectedInstance) {
      unsubscribeGridOverlay();
      unsubscribeGridOverlay =
        subscribeGridOverlay(instanceSelector ?? []) ?? (() => {});
      previousSelectedInstance = instanceSelector;
    }
  });

  return () => {
    unsubscribe();
    unsubscribeGridOverlay();
  };
};
