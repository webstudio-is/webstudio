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

const hideGridOverlay = () => {
  $gridCellData.set(undefined);
};

// Use probe elements to measure exact cell positions
// We probe a grid of positions and dedupe based on actual coordinates
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

  // First, detect actual column and row count by probing positions
  // Place probes and track unique X/Y positions
  const xPositions = new Set<number>();
  const yPositions = new Set<number>();

  // Probe columns: find where X stops increasing
  let lastX = -Infinity;
  let columnCount = 0;
  for (let col = 1; col <= MAX_PROBE; col++) {
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

    // Once X stops increasing, we've found all explicit columns
    if (rect.left <= lastX) {
      break;
    }
    xPositions.add(rect.left);
    xPositions.add(rect.right);
    lastX = rect.left;
    columnCount = col;
  }

  // Probe rows: find where Y stops increasing
  let lastY = -Infinity;
  let rowCount = 0;
  for (let row = 1; row <= MAX_PROBE; row++) {
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

    // Once Y stops increasing, we've found all explicit rows
    if (rect.top <= lastY) {
      break;
    }
    yPositions.add(rect.top);
    yPositions.add(rect.bottom);
    lastY = rect.top;
    rowCount = row;
  }

  if (columnCount === 0 || rowCount === 0) {
    return undefined;
  }

  // Now probe all cells to get accurate positions (handles gaps, etc.)
  for (let row = 1; row <= rowCount; row++) {
    for (let col = 1; col <= columnCount; col++) {
      const probe = document.createElement("div");
      probe.style.cssText = `
        grid-column: ${col};
        grid-row: ${row};
        pointer-events: none;
        visibility: hidden;
        align-self: stretch;
        justify-self: stretch;
      `;
      gridElement.appendChild(probe);
      const rect = probe.getBoundingClientRect();
      gridElement.removeChild(probe);

      xPositions.add(rect.left);
      xPositions.add(rect.right);
      yPositions.add(rect.top);
      yPositions.add(rect.bottom);
    }
  }

  // Sort positions
  const sortedX = [...xPositions].sort((a, b) => a - b);
  const sortedY = [...yPositions].sort((a, b) => a - b);

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
  selectedInstanceSelector: Readonly<InstanceSelector>,
  debounceEffect: (callback: () => void) => void
) => {
  if (selectedInstanceSelector.length === 0) {
    hideGridOverlay();
    return;
  }

  const gridInfo = findGridContainer(selectedInstanceSelector);

  if (!gridInfo) {
    hideGridOverlay();
    return;
  }

  const { element: gridElement, instanceId } = gridInfo;

  const updateGridOverlay = () => {
    if ($isResizingCanvas.get()) {
      hideGridOverlay();
      return;
    }

    const cellData = computeGridCells(gridElement, instanceId);
    $gridCellData.set(cellData);
  };

  // Initial computation
  updateGridOverlay();

  const unsubscribeStylesIndex = $stylesIndex.subscribe(() => {
    // Styles are applied to DOM via RAF in the stylesheet renderer,
    // then browser needs another frame to recalculate layout
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        debounceEffect(updateGridOverlay);
      });
    });
  });

  const unsubscribeInstances = $instances.subscribe(() => {
    debounceEffect(updateGridOverlay);
  });

  const unsubscribePropValues =
    $propValuesByInstanceSelectorWithMemoryProps.subscribe(() => {
      debounceEffect(updateGridOverlay);
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
    hideGridOverlay();
    unsubscribeStylesIndex();
    unsubscribeInstances();
    unsubscribePropValues();
    unsubscribeIsResizing();
    unsubscribeScrollState();
    unsubscribeWindowResize();
  };
};

export const subscribeGridOverlayOnSelected = (
  debounceEffect: (callback: () => void) => void
) => {
  let previousSelectedInstance: readonly string[] | undefined = undefined;
  let unsubscribeGridOverlay = () => {};

  const unsubscribe = $awareness.subscribe((awareness) => {
    const instanceSelector = awareness?.instanceSelector;
    if (instanceSelector !== previousSelectedInstance) {
      unsubscribeGridOverlay();
      unsubscribeGridOverlay =
        subscribeGridOverlay(instanceSelector ?? [], debounceEffect) ??
        (() => {});
      previousSelectedInstance = instanceSelector;
    }
  });

  return () => {
    unsubscribe();
    unsubscribeGridOverlay();
  };
};
