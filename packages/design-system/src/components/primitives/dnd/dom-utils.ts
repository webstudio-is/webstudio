import {
  type Rect,
  type ChildrenOrientation,
  getRectsOrientation,
  getTwoRectsOrientation,
} from "./geometry-utils";

const getOrientaionUsingProbe = (
  parent: Element,
  relativeToChild?: Element
): ChildrenOrientation => {
  const probe = document.createElement("div");
  if (relativeToChild) {
    parent.insertBefore(probe, relativeToChild);
  } else {
    parent.appendChild(probe);
  }
  const probeRect = probe.getBoundingClientRect();
  parent.removeChild(probe);

  // If there's no child, see if one of the dimensions collapsed.
  // If both or neither collapsed, fallback to vertical as the best guess.
  if (relativeToChild === undefined) {
    return {
      type:
        probeRect.width === 0 && probeRect.height > 0
          ? "horizontal"
          : "vertical",
      reverse: false,
    };
  }

  return getTwoRectsOrientation(
    probeRect,
    relativeToChild.getBoundingClientRect()
  );
};

// By looking at a specific child and it's neighbours,
// determines their orientation relative to each other
export const getLocalChildrenOrientation = (
  parent: Element,
  getChildren: (parent: Element) => Element[] | HTMLCollection,
  childrentRects: Rect[],
  childIndex: number
): ChildrenOrientation => {
  const previous = childrentRects[childIndex - 1] as Rect | undefined;
  const current = childrentRects[childIndex] as Rect | undefined;
  const next = childrentRects[childIndex + 1] as Rect | undefined;

  // If there are no two rects to compare, use a probe
  if (current === undefined || (next === undefined && previous === undefined)) {
    const children = getChildren(parent);
    return getOrientaionUsingProbe(
      parent,
      childIndex < children.length ? children[childIndex] : undefined
    );
  }

  return getRectsOrientation(previous, current, next);
};

export const getChildrenRects = (
  parent: Element,
  children: Element[] | HTMLCollection
) => {
  const parentRect = parent.getBoundingClientRect();

  // We convert to relative coordinates to be able to store the result in cache.
  // Otherwise we would have to clear cache on scroll etc.
  const toRelativeCoordinates = (rect: Rect) => ({
    left: rect.left - parentRect.left,
    top: rect.top - parentRect.top,
    width: rect.width,
    height: rect.height,
  });

  return Array.from(children).map((child) =>
    toRelativeCoordinates(child.getBoundingClientRect())
  );
};
