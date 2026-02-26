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
import { inflatedAttribute } from "@webstudio-is/react-sdk";
import { parseGridTemplateTrackList } from "@webstudio-is/css-data";

const hideGridOverlay = () => {
  $gridCellData.set(undefined);
};

// Use probe elements to measure exact cell positions.
// We probe one row of columns and one column of rows to find track edges,
// then compute grid LINE positions as midpoints between adjacent track
// boundaries (i.e. the centre of each gap). When tracks collapse to 0px
// we fall back to distributing lines evenly.
const computeGridCells = (
  gridElement: HTMLElement,
  instanceId: string
): GridCellData | undefined => {
  const computedStyle = window.getComputedStyle(gridElement);
  const display = computedStyle.display;

  // Only compute for grid containers
  if (display !== "grid" && display !== "inline-grid") {
    return undefined;
  }

  const MAX_PROBE = 20; // Reasonable limit for probing

  // Get the actual track counts from computed style
  const gridTemplateColumns = computedStyle.gridTemplateColumns;
  const gridTemplateRows = computedStyle.gridTemplateRows;

  const columnTracks = parseGridTemplateTrackList(gridTemplateColumns);
  const rowTracks = parseGridTemplateTrackList(gridTemplateRows);

  // Ensure at least 1 track, cap at MAX_PROBE
  const columnCount = Math.min(Math.max(1, columnTracks.length), MAX_PROBE);
  const rowCount = Math.min(Math.max(1, rowTracks.length), MAX_PROBE);

  // --- Probe one row to get column edges ---
  const columnEdges: Array<{ left: number; right: number }> = [];
  for (let col = 1; col <= columnCount; col++) {
    const probe = document.createElement("div");
    probe.style.cssText = `
      grid-column: ${col};
      grid-row: 1;
      pointer-events: none;
      visibility: hidden;
      align-self: stretch;
      justify-self: stretch;
    `;
    gridElement.appendChild(probe);
    const rect = probe.getBoundingClientRect();
    gridElement.removeChild(probe);
    columnEdges.push({ left: rect.left, right: rect.right });
  }

  // --- Probe one column to get row edges ---
  const rowEdges: Array<{ top: number; bottom: number }> = [];
  for (let row = 1; row <= rowCount; row++) {
    const probe = document.createElement("div");
    probe.style.cssText = `
      grid-column: 1;
      grid-row: ${row};
      pointer-events: none;
      visibility: hidden;
      align-self: stretch;
      justify-self: stretch;
    `;
    gridElement.appendChild(probe);
    const rect = probe.getBoundingClientRect();
    gridElement.removeChild(probe);
    rowEdges.push({ top: rect.top, bottom: rect.bottom });
  }

  // --- Compute grid line positions ---
  // Grid lines sit at: start of first track, midpoint of each gap, end of last track.
  // With no gap the midpoint equals the shared boundary.
  let sortedX: number[] = [];
  if (columnEdges.length > 0) {
    sortedX.push(columnEdges[0].left);
    for (let i = 0; i < columnEdges.length - 1; i++) {
      sortedX.push((columnEdges[i].right + columnEdges[i + 1].left) / 2);
    }
    sortedX.push(columnEdges[columnEdges.length - 1].right);
  }

  let sortedY: number[] = [];
  if (rowEdges.length > 0) {
    sortedY.push(rowEdges[0].top);
    for (let i = 0; i < rowEdges.length - 1; i++) {
      sortedY.push((rowEdges[i].bottom + rowEdges[i + 1].top) / 2);
    }
    sortedY.push(rowEdges[rowEdges.length - 1].bottom);
  }

  // --- Fallback when tracks collapse to 0px ---
  const containerRect = gridElement.getBoundingClientRect();
  const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
  const paddingRight = parseFloat(computedStyle.paddingRight) || 0;
  const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
  const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
  const contentLeft = containerRect.left + paddingLeft;
  const contentTop = containerRect.top + paddingTop;
  const contentWidth = containerRect.width - paddingLeft - paddingRight;
  const contentHeight = containerRect.height - paddingTop - paddingBottom;

  // For inflated grids the inflation padding IS the visible space, so
  // distribute fallback lines across the full container rect on inflated
  // axes. Non-inflated axes use the content box as usual.
  const inflatedAttr = gridElement.getAttribute(inflatedAttribute);
  const isWidthInflated = inflatedAttr === "w" || inflatedAttr === "wh";
  const isHeightInflated = inflatedAttr === "h" || inflatedAttr === "wh";

  const fallbackLeft = isWidthInflated ? containerRect.left : contentLeft;
  const fallbackTop = isHeightInflated ? containerRect.top : contentTop;
  const fallbackWidth = isWidthInflated ? containerRect.width : contentWidth;
  const fallbackHeight = isHeightInflated
    ? containerRect.height
    : contentHeight;

  // When all line positions collapse to (nearly) the same point the user
  // can't see anything useful. Fall back to an even distribution.
  // On inflated axes the visible space comes entirely from inflation padding,
  // so probed positions sit in a tiny content area — always use the fallback.
  const xSpan =
    sortedX.length >= 2 ? sortedX[sortedX.length - 1] - sortedX[0] : 0;
  const ySpan =
    sortedY.length >= 2 ? sortedY[sortedY.length - 1] - sortedY[0] : 0;

  if (xSpan < 1 || isWidthInflated) {
    sortedX = Array.from(
      { length: columnCount + 1 },
      (_, i) => fallbackLeft + (fallbackWidth * i) / columnCount
    );
  }

  if (ySpan < 1 || isHeightInflated) {
    sortedY = Array.from(
      { length: rowCount + 1 },
      (_, i) => fallbackTop + (fallbackHeight * i) / rowCount
    );
  }

  if (sortedX.length < 2 || sortedY.length < 2) {
    return undefined;
  }

  // Build lines from positions
  const gridLeft = sortedX[0];
  const gridRight = sortedX[sortedX.length - 1];
  const gridTop = sortedY[0];
  const gridBottom = sortedY[sortedY.length - 1];
  const gridWidth = gridRight - gridLeft;
  const gridHeight = gridBottom - gridTop;

  const horizontalLines: GridCellData["horizontalLines"] = [];
  for (const y of sortedY) {
    horizontalLines.push({ y, x: gridLeft, width: gridWidth });
  }

  const verticalLines: GridCellData["verticalLines"] = [];
  for (const x of sortedX) {
    verticalLines.push({ x, y: gridTop, height: gridHeight });
  }

  return {
    instanceId,
    columnCount,
    rowCount,
    horizontalLines,
    verticalLines,
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
