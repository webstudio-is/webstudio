import htmlTags, { voidHtmlTags, type HtmlTags } from "html-tags";
import { collapsedAttribute, idAttribute } from "@webstudio-is/react-sdk";
import { compareMedia, StyleValue } from "@webstudio-is/css-engine";
import {
  $breakpoints,
  $instances,
  $registeredComponentMetas,
  $stylesIndex,
} from "~/shared/nano-states";
import { $selectedBreakpoint } from "~/shared/nano-states";
import { $selectedPage } from "~/shared/awareness";
import { serverSyncStore } from "~/shared/sync";

const isHtmlTag = (tag: string): tag is HtmlTags =>
  htmlTags.includes(tag as HtmlTags);

const instanceIdSet = new Set<string>();

let rafHandle: number;

// Do not add collapsed paddings for replaced elements as at the moment we add them they don't have real size
// https://developer.mozilla.org/en-US/docs/Web/CSS/Replaced_element
const replacedHtmlElements = ["iframe", "video", "embed", "img"];

// Do not add collapsed paddings for void elements
// https://developer.mozilla.org/en-US/docs/Glossary/Void_element
const skipElementsSet = new Set([...voidHtmlTags, ...replacedHtmlElements]);

const isSelectorSupported = (selector: string) => {
  try {
    return Boolean(document.querySelector(selector));
  } catch {
    return false;
  }
};

// This mark helps us detect if mutations were caused by the collapse algorithm
const markCollapsedMutationProperty = `--ws-sys-collapsed-mutation`;

/**
 * Avoid infinite loop of mutations
 */
export const hasCollapsedMutationRecord = (
  mutationRecords: MutationRecord[]
) => {
  return mutationRecords.some((record) =>
    record.type === "attributes"
      ? (record.oldValue?.includes(markCollapsedMutationProperty) ?? false)
      : false
  );
};

const getInstanceSize = (instanceId: string, tagName: HtmlTags | undefined) => {
  const metas = $registeredComponentMetas.get();
  const breakpoints = $breakpoints.get();
  const selectedBreakpoint = $selectedBreakpoint.get();
  const { stylesByInstanceId } = $stylesIndex.get();
  const instances = $instances.get();
  const selectedBreakpointId = selectedBreakpoint?.id;

  if (selectedBreakpointId === undefined) {
    return {
      width: undefined,
      height: undefined,
    };
  }

  let widthValue: undefined | StyleValue;
  let heightValue: undefined | StyleValue;

  const component =
    instanceId === undefined ? undefined : instances.get(instanceId)?.component;
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

const MAX_SIZE_TO_USE_OPTIMIZATION = 50;

const findFirstNonContentsParent = (element: Element) => {
  // Start with the element's parent
  let parent = element.parentElement;

  // Continue traversing up until we find a non-contents parent or reach the top
  while (parent) {
    // Get the computed style of the parent
    const computedStyle = window.getComputedStyle(parent);

    const isHidden = parent.getAttribute("hidden") !== null;

    // Check if the display is not 'contents'
    if (computedStyle.display !== "contents" && !isHidden) {
      return parent;
    }

    // Move up to the next parent
    parent = parent.parentElement;
  }

  // Return null if no non-contents parent is found
  return null;
};

const recalculate = () => {
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

  /**
   *  Selector to find elements common ancestors, in case of no :has selector support select body
   **/
  const elementSelector = isSelectorSupported(":has(body)")
    ? `[${idAttribute}]${instanceIds
        .map((instanceId) => `:has([${idAttribute}="${instanceId}"])`)
        .join("")}`
    : "body";

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

  // If most elements are collapsed at the next step, scrollHeight becomes equal to clientHeight,
  // which resets the scroll position. To prevent this, we set the document's height to the current scrollHeight
  // to preserve the scroll position.
  const preserveHeight = document.documentElement.style.height;

  // Mark that we are in the process of recalculating collapsed elements
  document.documentElement.style.setProperty(
    markCollapsedMutationProperty,
    `true`
  );
  document.documentElement.style.height = `${document.documentElement.scrollHeight}px`;

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
    const elementInstanceId = element.getAttribute(idAttribute);

    if (elementInstanceId === null) {
      // Not a webstudio controlled element, like popover portal
      continue;
    }

    const tagName = element.tagName.toLowerCase();

    const elementSize = getInstanceSize(
      elementInstanceId,
      isHtmlTag(tagName) ? tagName : undefined
    );

    const collapsedWidth =
      element.offsetWidth === 0 && elementSize.width === undefined ? "w" : "";
    const collapsedHeight =
      element.offsetHeight === 0 && elementSize.height === undefined ? "h" : "";

    if (collapsedHeight || collapsedWidth) {
      collapsedElements.set(element, collapsedWidth + collapsedHeight);
    }
  }

  // 3. Add collapsed attributes
  for (const [element, value] of collapsedElements.entries()) {
    element.setAttribute(collapsedAttribute, value);
  }

  document.documentElement.style.height = preserveHeight;
  document.documentElement.style.removeProperty(markCollapsedMutationProperty);
};

/**
 * When we add elements or edit element styles, a situation arises where an element can collapse.
 * I.e. get either 0 width or 0 height or both.
 * We need the user to be able to select such elements anyway.
 * We try to find the minimum set of elements that will prevent any of the canvas elements from collapsing.
 * For such elements we set collapsedAttribute and then style helpers add padding to
 * prevent collapsing.
 **/
export const setDataCollapsed = (instanceId: string, syncExec = false) => {
  instanceIdSet.add(instanceId);

  cancelAnimationFrame(rafHandle);

  if (syncExec) {
    recalculate();
    return;
  }

  rafHandle = requestAnimationFrame(() => {
    recalculate();
  });
};

/**
 * For optimisation reasons try to extract instanceId of changed elements from pubsub
 * In that case we just check the subtree of parent/common ancestor of changed elements to find collapsed elements
 **/
export const subscribeCollapsed = () => {
  return serverSyncStore.subscribe((_transactionId, changes) => {
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
};
