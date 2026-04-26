import {
  $isResizingCanvas,
  $stylesIndex,
  $propValuesByInstanceSelectorWithMemoryProps,
} from "~/shared/nano-states";
import { $instances } from "~/shared/sync/data-stores";
import { $gridCellData, type GridCellData } from "~/shared/nano-states";
import { subscribeScrollState } from "~/canvas/shared/scroll-state";
import { subscribeWindowResize } from "~/shared/dom-hooks";
import type { InstanceSelector } from "~/shared/tree-utils";
import { $selectedInstanceSelector } from "~/shared/nano-states";
import { getElementByInstanceSelector } from "~/shared/dom-utils";
import { parseGridTemplateTrackList } from "@webstudio-is/css-data";
import { doNotTrackMutation } from "~/shared/dom-utils";

const hideGridGuides = () => {
  $gridCellData.set(undefined);
};

const MAX_TRACKS = 20;

// Read resolved CSS strings from getComputedStyle. No DOM probing needed —
// the builder grid guides mirror the grid via a child div that faithfully
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

// Sentinel value for the implicit track probe. Implicit (auto-generated)
// tracks will resolve to this size while explicit tracks keep their original
// resolved size. 1.25px is unlikely to appear in authored CSS.
const IMPLICIT_PROBE_SIZE = 1.25;

/**
 * Find the index where implicit tracks begin for one axis.
 * Parses the resolved template track list from a clone where
 * grid-auto-columns/rows are set to IMPLICIT_PROBE_SIZE px.
 * Returns the 0-based index of the first implicit track, or
 * trackCount when all tracks are explicit.
 */
const findImplicitStart = (
  resolvedTemplate: string,
  trackCount: number
): number => {
  const tracks = parseGridTemplateTrackList(resolvedTemplate);
  for (let i = 0; i < tracks.length; i++) {
    const size = parseFloat(tracks[i].value);
    if (Math.abs(size - IMPLICIT_PROBE_SIZE) < 0.01) {
      return i;
    }
  }
  return trackCount;
};

/**
 * Probe implicit track boundaries by creating a hidden clone of the grid
 * with grid-auto-columns/rows set to 1.25px. Implicit tracks resolve to
 * 1.25px while explicit tracks retain their authored size.
 */
const probeImplicitTracks = (
  gridElement: HTMLElement,
  columnCount: number,
  rowCount: number
): { implicitColumnStart: number; implicitRowStart: number } => {
  const clone = gridElement.cloneNode(false) as HTMLElement;
  doNotTrackMutation(clone);
  clone.style.cssText = window.getComputedStyle(gridElement).cssText;
  clone.style.position = "fixed";
  clone.style.visibility = "hidden";
  clone.style.pointerEvents = "none";
  clone.style.gridAutoColumns = `${IMPLICIT_PROBE_SIZE}px`;
  clone.style.gridAutoRows = `${IMPLICIT_PROBE_SIZE}px`;

  // Copy child placeholders so the browser generates the same implicit tracks
  for (const child of gridElement.children) {
    const placeholder = document.createElement("div");
    const childStyle = window.getComputedStyle(child);
    placeholder.style.gridColumnStart = childStyle.gridColumnStart;
    placeholder.style.gridColumnEnd = childStyle.gridColumnEnd;
    placeholder.style.gridRowStart = childStyle.gridRowStart;
    placeholder.style.gridRowEnd = childStyle.gridRowEnd;
    placeholder.style.order = childStyle.order;
    doNotTrackMutation(placeholder);
    clone.appendChild(placeholder);
  }

  document.body.appendChild(clone);
  const probeStyle = window.getComputedStyle(clone);
  const implicitColumnStart = findImplicitStart(
    probeStyle.gridTemplateColumns,
    columnCount
  );
  const implicitRowStart = findImplicitStart(
    probeStyle.gridTemplateRows,
    rowCount
  );
  document.body.removeChild(clone);

  return { implicitColumnStart, implicitRowStart };
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

  const { implicitColumnStart, implicitRowStart } = probeImplicitTracks(
    gridElement,
    columnCount,
    rowCount
  );

  return {
    instanceId,
    columnCount,
    rowCount,
    bcr: { top: bcr.top, left: bcr.left },
    untransformedWidth,
    untransformedHeight,
    resolvedCssText: parts.join(";"),
    implicitColumnStart,
    implicitRowStart,
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

const subscribeGridGuides = (
  selectedInstanceSelector: Readonly<InstanceSelector>
) => {
  if (selectedInstanceSelector.length === 0) {
    hideGridGuides();
    return;
  }

  let rafId = 0;

  // Re-evaluate findGridContainer on every update so that the overlay
  // appears as soon as an element becomes a grid (e.g. display changed
  // from block → grid) without requiring a re-selection.
  const updateGridGuides = () => {
    if ($isResizingCanvas.get()) {
      hideGridGuides();
      return;
    }

    const gridInfo = findGridContainer(selectedInstanceSelector);
    if (!gridInfo) {
      hideGridGuides();
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
        updateGridGuides();
      });
    });
  };

  // Initial computation
  updateGridGuides();

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
      hideGridGuides();
    } else {
      updateGridGuides();
    }
  });

  const unsubscribeScrollState = subscribeScrollState({
    onScrollStart: hideGridGuides,
    onScrollEnd: updateGridGuides,
  });

  const unsubscribeWindowResize = subscribeWindowResize({
    onResizeStart: hideGridGuides,
    onResizeEnd: updateGridGuides,
  });

  return () => {
    cancelAnimationFrame(rafId);
    hideGridGuides();
    unsubscribeStylesIndex();
    unsubscribeInstances();
    unsubscribePropValues();
    unsubscribeIsResizing();
    unsubscribeScrollState();
    unsubscribeWindowResize();
  };
};

export const subscribeGridGuidesOnSelected = () => {
  let previousSelectedInstance: readonly string[] | undefined = undefined;
  let unsubscribeGridGuides = () => {};

  const unsubscribe = $selectedInstanceSelector.subscribe(
    (instanceSelector) => {
      if (instanceSelector !== previousSelectedInstance) {
        unsubscribeGridGuides();
        unsubscribeGridGuides =
          subscribeGridGuides(instanceSelector ?? []) ?? (() => {});
        previousSelectedInstance = instanceSelector;
      }
    }
  );

  return () => {
    unsubscribe();
    unsubscribeGridGuides();
  };
};

export const __testing__ = {
  findImplicitStart,
};
