import { collapsedAttribute } from "@webstudio-is/react-sdk";
import { subscribe } from "~/shared/pubsub";

const instanceIdSet = new Set<string>();
let rafHandle: number;

// Do not add collapsed paddings for void elements
// https://developer.mozilla.org/en-US/docs/Glossary/Void_element
const voidHtmlElements = [
  "AREA",
  "BASE",
  "BR",
  "COL",
  "EMBED",
  "HR",
  "IMG",
  "INPUT",
  "LINK",
  "META",
  "SOURCE",
  "TRACK",
  "WBR",
];

// Do not add collapsed paddings for replaced elements as at the moment we add them they don't have real size
// https://developer.mozilla.org/en-US/docs/Web/CSS/Replaced_element
const replacedHtmlElements = ["IFRAME", "VIDEO", "EMBED", "IMG"];

const skipElementsSet = new Set([...voidHtmlElements, ...replacedHtmlElements]);

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
  const elementSelector =
    instanceIds.length === 1
      ? `[data-ws-id="${instanceIds[0]}"]`
      : `[data-ws-id]${instanceIds
          .map((instanceId) => `:has([data-ws-id="${instanceId}"])`)
          .join("")}`;

  const elements: Element[] = [];

  // Element itself or common ancestor or body
  const baseElement =
    Array.from(document.querySelectorAll(elementSelector)).pop() ??
    document.body;
  elements.push(baseElement);

  const descendants = baseElement.querySelectorAll("[data-ws-id]");
  elements.push(...descendants);

  const elementsToRecalculate: HTMLElement[] = [];
  const parentsWithAbsoluteChildren = new Map<HTMLElement, number>();

  for (const element of elements) {
    if (!(element instanceof HTMLElement)) {
      continue;
    }

    if (skipElementsSet.has(element.tagName)) {
      // Images should not collapse, and have a fallback.
      // The issue that unloaded image has 0 width and height until explicitly set,
      // so at the moment new Image added we detect it as collapsed.
      // Skip it for now.
      continue;
    }

    // Find all Leaf like elements
    // Leaf like elements are elements that have no children or all children are absolute or fixed
    if (element.childElementCount === 0) {
      elementsToRecalculate.push(element);
    }

    const elementPosition = window.getComputedStyle(element).position;

    if (element.parentElement) {
      if (elementPosition === "absolute" || elementPosition === "fixed") {
        parentsWithAbsoluteChildren.set(
          element.parentElement,
          parentsWithAbsoluteChildren.get(element.parentElement) ?? 0
        );
      } else {
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
  baseElement.parentElement?.removeAttribute(collapsedAttribute);
  baseElement.removeAttribute(collapsedAttribute);
  for (const element of baseElement.querySelectorAll(
    `[${collapsedAttribute}]`
  )) {
    element.removeAttribute(collapsedAttribute);
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

/**
 * When we add elements or edit element styles, a situation arises where an element can collapse.
 * I.e. get either 0 width or 0 height or both.
 * We need the user to be able to select such elements anyway.
 * We try to find the minimum set of elements that will prevent any of the canvas elements from collapsing.
 * For such elements we set collapsedAttribute and then style helpers add padding to
 * prevent collapsing.
 **/
export const setDataCollapsed = (instanceId: string) => {
  instanceIdSet.add(instanceId);

  cancelAnimationFrame(rafHandle);

  rafHandle = requestAnimationFrame(() => {
    recalculate();
  });
};

/**
 * For optimisation reasons try to extract instanceId of changed elements from pubsub
 * In that case we just check the subtree + parent of changed element to find collapsed elements
 **/
export const subscribeCollapsedToPubSub = () =>
  subscribe("sendStoreChanges", ({ source, changes }) => {
    for (const change of changes) {
      if (change.namespace === "styleSourceSelections") {
        for (const patch of change.patches) {
          const instanceId = patch.value?.instanceId;

          if (typeof instanceId === "string") {
            setDataCollapsed(instanceId);
          }
        }
      }
    }
  });
