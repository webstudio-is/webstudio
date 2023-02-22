import { collapsedAttribute } from "@webstudio-is/react-sdk";

const instanceIdSet = new Set<string>();
let rafHandle: number;

const recalculate = () => {
  const instanceIds = Array.from(instanceIdSet);
  instanceIdSet.clear();
  if (instanceIds.length === 0) {
    return;
  }

  /**
   *  Selector to find element itself or common ancestor
   *  (finding common ancestor is suboptimal solution but it almost never happens)
   **/
  const eltSelector =
    instanceIds.length === 1
      ? `[data-ws-id=${instanceIds[0]}]`
      : `[data-ws-id]${instanceIds
          .map((instanceId) => `:has([data-ws-id=${instanceId}])`)
          .join("")}`;

  const elements: Element[] = [];

  // Element itself or common ancestor or body
  const baseElement =
    Array.from(document.querySelectorAll(eltSelector)).pop() ?? document.body;
  elements.push(baseElement);

  const descendants = baseElement.querySelectorAll("[data-ws-id]");
  elements.push(...descendants);

  const elementsToRecalculate: HTMLElement[] = [];
  const parentsWithAbsoluteChildren = new Map<HTMLElement, number>();

  for (const element of elements) {
    if (!(element instanceof HTMLElement)) {
      continue;
    }
    // Find all Leaf like elements
    if (element.childElementCount === 0) {
      elementsToRecalculate.push(element);
    }

    const elementPosution = window.getComputedStyle(element).position;

    if (elementPosution === "absolute" || elementPosution === "fixed") {
      if (element.parentElement) {
        parentsWithAbsoluteChildren.set(
          element.parentElement,
          parentsWithAbsoluteChildren.get(element.parentElement) ?? 0
        );
      }
    } else {
      if (element.parentElement) {
        parentsWithAbsoluteChildren.set(element.parentElement, 1);
      }
    }
  }

  for (const [element, value] of parentsWithAbsoluteChildren.entries()) {
    // All children are absolute or fixed
    if (value === 0) {
      elementsToRecalculate.push(element);
    }
  }

  // Now combine all operations in batches.

  // 1. Remove all collapsed attributes
  for (const elt of document.querySelectorAll(`[${collapsedAttribute}]`)) {
    elt.removeAttribute(collapsedAttribute);
  }

  // 2. Calculate collapsed state
  const collapsedElements = new Map<HTMLElement, string>();

  for (const element of elementsToRecalculate) {
    const collapsedWidth = element.offsetWidth === 0 ? "w" : "";
    const collapsedHeight = element.offsetHeight === 0 ? "h" : "";

    if (collapsedHeight || collapsedWidth) {
      collapsedElements.set(element, collapsedWidth + collapsedHeight);
    }
  }

  // 3. Add collapsed attributes
  for (const [element, value] of collapsedElements.entries()) {
    element.setAttribute(collapsedAttribute, value);
  }
};

export const setDataCollapsed = (instanceId: string) => {
  instanceIdSet.add(instanceId);

  cancelAnimationFrame(rafHandle);

  recalculate();

  rafHandle = requestAnimationFrame(recalculate);

  // When we remove this attribute, artifical helper spacers will be removed,
  // then we synchronously calculate height/width to see if element would collapse
  // then we add spacers back on the side that requires them right away.
  // The idea is to not trigger a reflow while we are calculating offsets before we know
  // if the elmenent needs spacers, because this is going to happen every time elemnt updates and
  // we don't want to trigger a reflow every time.
  /*
  element.removeAttribute(collapsedAttribute);
  const collapsedWidth = element.offsetWidth === 0 ? "w" : "";
  const collapsedHeight = element.offsetHeight === 0 ? "h" : "";
  if (collapsedHeight || collapsedWidth) {
    element.setAttribute(collapsedAttribute, collapsedWidth + collapsedHeight);
  }
  */
};
