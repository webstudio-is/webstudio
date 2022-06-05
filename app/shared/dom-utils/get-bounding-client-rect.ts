import memoize from "lodash.memoize";

// For example used to avoid recalculating rects for each node during dragging.
export const getBoundingClientRect = memoize((element: Element | HTMLElement) =>
  element.getBoundingClientRect()
);
