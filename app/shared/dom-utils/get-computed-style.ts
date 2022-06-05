import memoize from "lodash.memoize";

// For example used to avoid recalculating rects for each node during dragging.
export const getComputedStyle = memoize((element: Element | HTMLElement) =>
  window.getComputedStyle(element)
);
