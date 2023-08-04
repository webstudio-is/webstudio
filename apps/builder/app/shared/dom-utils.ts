import type { Instance } from "@webstudio-is/project-build";
import { idAttribute, selectorIdAttribute } from "@webstudio-is/react-sdk";
import type { InstanceSelector } from "./tree-utils";
import { getIsVisuallyHidden } from "./visually-hidden";

export const getInstanceIdFromElement = (
  element: Element
): Instance["id"] | undefined => {
  return element.getAttribute(idAttribute) ?? undefined;
};

// traverse dom to the root and find all instances
export const getInstanceSelectorFromElement = (element: Element) => {
  // Change logic to support Portals
  const matched: undefined | Element =
    element.closest(`[${idAttribute}]`) ?? undefined;

  const instanceSelector: InstanceSelector =
    matched?.getAttribute(selectorIdAttribute)?.split(",") ?? [];

  if (instanceSelector.length === 0) {
    return;
  }
  return instanceSelector;
};

export const getElementByInstanceSelector = (
  instanceSelector: InstanceSelector | Readonly<InstanceSelector>
) => {
  return (
    document.querySelector<HTMLElement>(
      `[${selectorIdAttribute}="${instanceSelector.join(",")}"]`
    ) ?? undefined
  );
};

/**
 * Get root visible elements, even if instance
 **/
export const getElementsByInstanceSelector = (
  instanceSelector: InstanceSelector | Readonly<InstanceSelector>
) => {
  const descendantsOrSelf = [
    ...document.querySelectorAll<HTMLElement>(
      `[${selectorIdAttribute}$="${instanceSelector.join(",")}"]`
    ),
  ].filter((element) => getIsVisuallyHidden(element) === false);

  const visibleIdSelectors = descendantsOrSelf.map(
    (element) => element.getAttribute(selectorIdAttribute) ?? ""
  );

  // Find root selectors (i.e. selectors that are not descendants of other selectors)
  let rootSelectors = [...visibleIdSelectors];
  const isDescendant = (testSelector: string, selector: string) =>
    testSelector.endsWith(`,${selector}`);

  for (const selector of visibleIdSelectors) {
    rootSelectors = rootSelectors.filter(
      (rootSelector) => isDescendant(rootSelector, selector) === false
    );
  }

  const rootSelectorSet = new Set(rootSelectors);

  const rootElements = descendantsOrSelf.filter((element) =>
    rootSelectorSet.has(element.getAttribute(selectorIdAttribute) ?? "")
  );

  return rootElements;
};

type Rect = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

const sumRects = (first: Rect, second: Rect) => {
  return {
    top: Math.min(first.top, second.top),
    right: Math.max(first.right, second.right),
    bottom: Math.max(first.bottom, second.bottom),
    left: Math.min(first.left, second.left),
  };
};

export const getAllElementsBoundingBox = (elements: Element[]): DOMRect => {
  const rects: Rect[] = [];

  if (elements.length === 0) {
    return DOMRect.fromRect({ width: 0, height: 0, x: 0, y: 0 });
  }

  for (const element of elements) {
    const rect = element.getBoundingClientRect();

    // possible display: contents
    if (rect.width !== 0 || rect.height !== 0) {
      rects.push(rect);
      continue;
    }

    if (element.children.length === 0) {
      continue;
    }

    const childRect = getAllElementsBoundingBox([...element.children]);
    if (childRect.width !== 0 || childRect.height !== 0) {
      const { top, right, bottom, left } = childRect;
      rects.push({ top, right, bottom, left });
    }
  }

  if (rects.length === 0) {
    // To preserve position even if width/height is 0
    return elements[0].getBoundingClientRect();
  }

  const { top, right, bottom, left } = rects.reduce(sumRects);

  return DOMRect.fromRect({
    x: left,
    y: top,
    height: bottom - top,
    width: right - left,
  });
};
