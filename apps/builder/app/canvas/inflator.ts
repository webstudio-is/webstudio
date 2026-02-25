import htmlTags, { voidHtmlTags, type HtmlTags } from "html-tags";
import { inflatedAttribute, idAttribute } from "@webstudio-is/react-sdk";
import { compareMedia, type StyleValue } from "@webstudio-is/css-engine";
import type { Breakpoint, StyleDecl, WsComponentMeta } from "@webstudio-is/sdk";
import {
  $breakpoints,
  $instances,
  $registeredComponentMetas,
  $stylesIndex,
} from "~/shared/nano-states";
import { $selectedBreakpoint } from "~/shared/nano-states";
import { $selectedPage } from "~/shared/awareness";
import { serverSyncStore } from "~/shared/sync/sync-stores";
import { doNotTrackMutation } from "~/shared/dom-utils";

const isHtmlTag = (tag: string): tag is HtmlTags =>
  htmlTags.includes(tag as HtmlTags);

const instanceIdSet = new Set<string>();

let rafHandle: number;

// Do not add inflation paddings for replaced elements as at the moment we add them they don't have real size
// https://developer.mozilla.org/en-US/docs/Web/CSS/Replaced_element
const replacedHtmlElements = ["iframe", "video", "embed", "img"];

// Do not add inflation paddings for void elements
// https://developer.mozilla.org/en-US/docs/Glossary/Void_element
const skipElementsSet = new Set([...voidHtmlTags, ...replacedHtmlElements]);

const isSelectorSupported = (selector: string) => {
  try {
    return Boolean(document.querySelector(selector));
  } catch {
    return false;
  }
};

/**
 * Determine explicit width/height for an instance from preset + breakpoint styles.
 * Returns `{ width, height }` where each is a number if explicitly set via a unit value,
 * or `undefined` if not set or set to a non-unit value (e.g., `auto`).
 *
 * Pure function — accepts all data as parameters for testability.
 */
const getInstanceSize = ({
  instanceId,
  tagName,
  metas,
  breakpoints,
  selectedBreakpointId,
  stylesByInstanceId,
  instances,
}: {
  instanceId: string;
  tagName: HtmlTags | undefined;
  metas: Map<string, WsComponentMeta>;
  breakpoints: Map<string, Breakpoint>;
  selectedBreakpointId: string | undefined;
  stylesByInstanceId: Map<string, StyleDecl[]>;
  instances: Map<string, { component: string }>;
}): { width: number | undefined; height: number | undefined } => {
  if (selectedBreakpointId === undefined) {
    return { width: undefined, height: undefined };
  }

  let widthValue: undefined | StyleValue;
  let heightValue: undefined | StyleValue;

  const component = instances.get(instanceId)?.component;
  if (component && tagName) {
    const presetStyles = metas.get(component)?.presetStyle?.[tagName] ?? [];
    for (const styleDecl of presetStyles) {
      if (styleDecl.state === undefined) {
        if (styleDecl.property === "width") {
          widthValue = styleDecl.value;
        }
        if (styleDecl.property === "height") {
          heightValue = styleDecl.value;
        }
      }
    }
  }

  const sortedBreakpoints = Array.from(breakpoints.values()).sort(compareMedia);
  const matchingBreakpoints: string[] = [];
  for (const breakpoint of sortedBreakpoints) {
    matchingBreakpoints.push(breakpoint.id);
    if (breakpoint.id === selectedBreakpointId) {
      break;
    }
  }

  const instanceStyles = stylesByInstanceId.get(instanceId);
  if (instanceStyles) {
    for (const breakpointId of matchingBreakpoints) {
      for (const styleDecl of instanceStyles) {
        if (
          styleDecl.breakpointId === breakpointId &&
          styleDecl.state === undefined
        ) {
          if (styleDecl.property === "width") {
            widthValue = styleDecl.value;
          }
          if (styleDecl.property === "height") {
            heightValue = styleDecl.value;
          }
        }
      }
    }
  }

  return {
    width: widthValue?.type === "unit" ? widthValue.value : undefined,
    height: heightValue?.type === "unit" ? heightValue.value : undefined,
  };
};

/**
 * Determine the inflation state for an element based on its actual dimensions
 * and whether explicit sizes are set. Returns `"w"`, `"h"`, `"wh"`, or `""`.
 *
 * Pure function for testability.
 */
const getInflationState = ({
  offsetWidth,
  offsetHeight,
  explicitWidth,
  explicitHeight,
}: {
  offsetWidth: number;
  offsetHeight: number;
  explicitWidth: number | undefined;
  explicitHeight: number | undefined;
}): string => {
  const inflateWidth =
    offsetWidth === 0 && explicitWidth === undefined ? "w" : "";
  const inflateHeight =
    offsetHeight === 0 && explicitHeight === undefined ? "h" : "";
  return inflateWidth + inflateHeight;
};

/**
 * Build a CSS selector to find the common ancestor of a set of instance IDs.
 * Falls back to `"body"` when `:has()` is not supported.
 *
 * Pure function for testability.
 */
const buildAncestorSelector = ({
  instanceIds,
  hasSelectorSupport,
}: {
  instanceIds: string[];
  hasSelectorSupport: boolean;
}): string => {
  if (!hasSelectorSupport) {
    return "body";
  }
  return `[${idAttribute}]${instanceIds
    .map((instanceId) => `:has([${idAttribute}="${instanceId}"])`)
    .join("")}`;
};

/**
 * Extract instanceIds from server sync store changes that affect style source selections.
 *
 * Pure function for testability.
 */
const extractInstanceIdsFromChanges = (
  changes: Array<{
    namespace: string;
    patches: Array<{ value?: { instanceId?: unknown } }>;
  }>
): string[] => {
  const ids: string[] = [];
  for (const change of changes) {
    if (change.namespace === "styleSourceSelections") {
      for (const patch of change.patches) {
        const instanceId = patch.value?.instanceId;
        if (typeof instanceId === "string") {
          ids.push(instanceId);
        }
      }
    }
  }
  return ids;
};

const MAX_SIZE_TO_USE_OPTIMIZATION = 50;

const findFirstNonContentsParent = (element: Element) => {
  let parent = element.parentElement;

  while (parent) {
    const computedStyle = window.getComputedStyle(parent);
    const isHidden = parent.getAttribute("hidden") !== null;

    if (computedStyle.display !== "contents" && !isHidden) {
      return parent;
    }

    parent = parent.parentElement;
  }

  return undefined;
};

const applyInflation = () => {
  const rootInstanceId = $selectedPage.get()?.rootInstanceId;

  // Below algorithm quickly finds the common ancestor of all elements with an instanceId.
  // However, for a large number of elements, it's more efficient to calculate from the root.
  // In almost all cases, if instanceIdsSet >= MAX_SIZE_TO_USE_OPTIMIZATION, it likely includes all elements.
  const instanceIds =
    instanceIdSet.size < MAX_SIZE_TO_USE_OPTIMIZATION
      ? Array.from(instanceIdSet)
      : rootInstanceId !== undefined
        ? [rootInstanceId]
        : [];

  instanceIdSet.clear();
  if (instanceIds.length === 0) {
    return;
  }

  const hasSelectorSupport = isSelectorSupported(":has(body)");

  const elementSelector = buildAncestorSelector({
    instanceIds,
    hasSelectorSupport,
  });

  const elements: Element[] = [];

  // Element itself or last common ancestor or body
  const baseElement =
    Array.from(document.querySelectorAll(elementSelector)).pop() ??
    document.body;
  elements.push(baseElement);

  const descendants = baseElement.querySelectorAll(`[${idAttribute}]`);
  elements.push(...descendants);

  const elementsToRecalculate: HTMLElement[] = [];
  const parentsWithAbsoluteChildren = new Map<HTMLElement, number>();

  for (const element of elements) {
    if (!(element instanceof HTMLElement)) {
      continue;
    }

    if (skipElementsSet.has(element.tagName.toLowerCase())) {
      // Images should not collapse, and have a fallback.
      // The issue that unloaded image has 0 width and height until explicitly set,
      // so at the moment new Image added we detect it as collapsed.
      // Skip it for now.
      continue;
    }

    const elementStyle = window.getComputedStyle(element);

    // Find all Leaf like elements
    // Leaf like elements are elements that have no children or all children are absolute or fixed
    // Excluding hidden elements without size
    if (element.childElementCount === 0) {
      if (element.offsetParent !== null) {
        elementsToRecalculate.push(element);
      }

      if (elementStyle.position === "fixed") {
        elementsToRecalculate.push(element);
      }
    }

    const parentElement = findFirstNonContentsParent(element);

    if (parentElement) {
      if (
        elementStyle.position === "absolute" ||
        elementStyle.position === "fixed" ||
        element.offsetParent == null // collapsed or none
      ) {
        parentsWithAbsoluteChildren.set(
          parentElement,
          parentsWithAbsoluteChildren.get(parentElement) ?? 0
        );
      } else {
        parentsWithAbsoluteChildren.set(parentElement, 1);
      }
    }
  }

  for (const [element, value] of parentsWithAbsoluteChildren.entries()) {
    // HTML is not part of webstudio data so skip to not process
    if (element.tagName === "HTML") {
      continue;
    }

    // All children are absolute or fixed
    if (value === 0) {
      elementsToRecalculate.push(element);
    }
  }

  // If most elements are inflated at the next step, scrollHeight becomes equal to clientHeight,
  // which resets the scroll position. To prevent this, we set the document's height to the current scrollHeight
  // to preserve the scroll position.
  // use nested element to avoid full page repaint and freeze on big projects
  let inflatorElement = document.querySelector(
    "#ws-inflator"
  ) as null | HTMLElement;
  if (!inflatorElement) {
    inflatorElement = document.createElement("div") as HTMLElement;
    inflatorElement.style.position = "absolute";
    inflatorElement.style.top = "0px";
    inflatorElement.style.left = "0px";
    inflatorElement.style.right = "0px";
    inflatorElement.setAttribute("id", "ws-inflator");
    inflatorElement.setAttribute("hidden", "true");
    // Mark that we are in the process of recalculating inflated elements
    // to avoid infinite loop of mutations
    doNotTrackMutation(inflatorElement);
    document.documentElement.appendChild(inflatorElement);
  }
  inflatorElement.removeAttribute("hidden");
  inflatorElement.style.height = `${document.documentElement.scrollHeight}px`;

  // Now combine all operations in batches.

  // 1. Remove all inflated attributes
  baseElement.parentElement?.removeAttribute(inflatedAttribute);
  baseElement.removeAttribute(inflatedAttribute);
  for (const element of baseElement.querySelectorAll(
    `[${inflatedAttribute}]`
  )) {
    element.removeAttribute(inflatedAttribute);
  }

  // 2. Read stores once for all elements
  const metas = $registeredComponentMetas.get();
  const breakpoints = $breakpoints.get();
  const selectedBreakpoint = $selectedBreakpoint.get();
  const { stylesByInstanceId } = $stylesIndex.get();
  const allInstances = $instances.get();
  const selectedBreakpointId = selectedBreakpoint?.id;

  // 3. Calculate inflation state
  const inflatedElements = new Map<HTMLElement, string>();

  for (const element of elementsToRecalculate) {
    const elementInstanceId = element.getAttribute(idAttribute);

    if (elementInstanceId === null) {
      // Not a webstudio controlled element, like popover portal
      continue;
    }

    const tagName = element.tagName.toLowerCase();

    const elementSize = getInstanceSize({
      instanceId: elementInstanceId,
      tagName: isHtmlTag(tagName) ? tagName : undefined,
      metas,
      breakpoints,
      selectedBreakpointId,
      stylesByInstanceId,
      instances: allInstances,
    });

    const state = getInflationState({
      offsetWidth: element.offsetWidth,
      offsetHeight: element.offsetHeight,
      explicitWidth: elementSize.width,
      explicitHeight: elementSize.height,
    });

    if (state) {
      inflatedElements.set(element, state);
    }
  }

  // 4. Add inflated attributes
  for (const [element, value] of inflatedElements.entries()) {
    element.setAttribute(inflatedAttribute, value);
  }

  inflatorElement.setAttribute("hidden", "true");
};

/**
 * When we add elements or edit element styles, a situation arises where an element can collapse
 * to 0 width, 0 height, or both. We need the user to be able to select such elements anyway.
 * We find the minimum set of elements that would otherwise collapse, set the inflatedAttribute
 * on them, and style helpers add padding to prevent collapsing.
 **/
export const inflateInstance = (instanceId: string, syncExec = false) => {
  instanceIdSet.add(instanceId);

  cancelAnimationFrame(rafHandle);

  if (syncExec) {
    applyInflation();
    return;
  }

  rafHandle = requestAnimationFrame(() => {
    applyInflation();
  });
};

/**
 * For optimisation reasons try to extract instanceId of changed elements from pubsub.
 * In that case we just check the subtree of parent/common ancestor of changed elements
 * to find elements that need inflation.
 **/
export const subscribeInflator = () => {
  return serverSyncStore.subscribe((_transactionId, changes) => {
    const ids = extractInstanceIdsFromChanges(changes);
    for (const id of ids) {
      inflateInstance(id);
    }
  });
};

export const __testing__ = {
  getInstanceSize,
  getInflationState,
  buildAncestorSelector,
  extractInstanceIdsFromChanges,
};
