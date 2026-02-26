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

// CSS properties synced to the builder overlay mirror div.
// To support a new property, add it here — no type or builder changes needed.
const mirrorProperties = [
  // Grid layout
  "display",
  "grid-template-columns",
  "grid-template-rows",
  "grid-template-areas",
  "column-gap",
  "row-gap",
  "justify-content",
  "justify-items",
  "align-content",
  "align-items",
  // Box model
  "width",
  "height",
  "box-sizing",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
  "border-top-style",
  "border-right-style",
  "border-bottom-style",
  "border-left-style",
  // Direction
  "direction",
  // Transforms
  "transform",
  "transform-origin",
  "scale",
  "rotate",
  "translate",
];

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

  const untransformedWidth = gridElement.offsetWidth;
  const untransformedHeight = gridElement.offsetHeight;

  if (untransformedWidth < 1 || untransformedHeight < 1) {
    return;
  }

  const bcr = gridElement.getBoundingClientRect();

  // Build cssText from a whitelist of properties that affect grid layout
  // and visual appearance. Adding a new property = one line here.
  const parts: string[] = [];
  for (const prop of mirrorProperties) {
    const value = computedStyle.getPropertyValue(prop);
    if (value) {
      parts.push(`${prop}:${value}`);
    }
  }
  // Override border-color to transparent — we need border space but not color
  parts.push("border-color:transparent");

  return {
    instanceId,
    columnCount,
    rowCount,
    bcr: { top: bcr.top, left: bcr.left },
    untransformedWidth,
    untransformedHeight,
    resolvedCssText: parts.join(";"),
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
