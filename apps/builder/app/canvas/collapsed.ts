import { collapsedAttribute, idAttribute } from "@webstudio-is/react-sdk";
import {
  getCascadedBreakpointIds,
  getCascadedInfo,
  getInstanceComponent,
  getPresetStyleRule,
} from "~/builder/features/style-panel/shared/style-info";
import {
  breakpointsStore,
  instancesStore,
  registeredComponentMetasStore,
  selectedPageStore,
  stylesIndexStore,
} from "~/shared/nano-states";
import { selectedBreakpointStore } from "~/shared/nano-states";
import { subscribe } from "~/shared/pubsub";
import htmlTags, { type htmlTags as HtmlTags } from "html-tags";

const isHtmlTag = (tag: string): tag is HtmlTags =>
  htmlTags.includes(tag as HtmlTags);

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

const getInstanceSize = (instanceId: string, tagName: HtmlTags | undefined) => {
  const metas = registeredComponentMetasStore.get();
  const breakpoints = breakpointsStore.get();
  const selectedBreakpoint = selectedBreakpointStore.get();
  const { stylesByInstanceId } = stylesIndexStore.get();
  const instances = instancesStore.get();
  const selectedBreakpointId = selectedBreakpoint?.id;

  if (selectedBreakpointId === undefined) {
    return {
      width: undefined,
      height: undefined,
    };
  }

  const cascadedBreakpointIds = getCascadedBreakpointIds(
    breakpoints,
    selectedBreakpointId
  );

  const component = getInstanceComponent(instances, instanceId);
  const presetStyle =
    tagName !== undefined && component !== undefined
      ? getPresetStyleRule(metas.get(component), tagName)
      : undefined;

  const cascadedStyle = getCascadedInfo(stylesByInstanceId, instanceId, [
    ...cascadedBreakpointIds,
    selectedBreakpointId,
  ]);

  const widthStyle = cascadedStyle?.width?.value ?? presetStyle?.width;
  const heightStyle = cascadedStyle?.height?.value ?? presetStyle?.height;

  return {
    width:
      widthStyle !== undefined && widthStyle.type === "unit"
        ? widthStyle.value
        : undefined,
    height:
      heightStyle !== undefined && heightStyle.type === "unit"
        ? heightStyle.value
        : undefined,
  };
};

const MAX_SIZE_TO_USE_OPTIMIZATION = 50;

const recalculate = () => {
  const rootInstanceId = selectedPageStore.get()?.rootInstanceId;

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
   *  Selector to find elements common ancestors
   **/
  const elementSelector = `[${idAttribute}]${instanceIds
    .map((instanceId) => `:has([${idAttribute}="${instanceId}"])`)
    .join("")}`;

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
    // HTML is not part of webstudio data so skip to not process
    if (element.tagName === "HTML") {
      continue;
    }
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
    const elementInstanceId = element.getAttribute(idAttribute);

    if (elementInstanceId === null) {
      throw new Error(`Element ${idAttribute} has no instance id`);
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
export const subscribeCollapsedToPubSub = () =>
  subscribe("sendStoreChanges", ({ changes }) => {
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
