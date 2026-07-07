import { getInstanceSelectorFromElement } from "~/shared/dom-utils";
import { selectorIdAttribute } from "@webstudio-is/react-sdk";
import {
  $allSelectedInstanceSelectors,
  $hoveredInstanceOutline,
  $hoveredInstanceSelector,
  $isContentMode,
  $propsIndex,
  $registeredComponentMetas,
  $selectedInstanceSelector,
  $textEditingInstanceSelector,
  selectInstance,
  selectInstances,
} from "~/shared/nano-states";
import { getInstanceSelectionUpdate } from "~/shared/instance-utils/selection";
import { $props } from "~/shared/sync/data-stores";
import { $instances } from "~/shared/sync/data-stores";
import { $ephemeralStyles } from "~/canvas/stores";
import { emitCommand } from "./shared/commands";
import { shallowEqual } from "shallow-equal";
import { findClosestRichText } from "~/shared/content-model";
import {
  areInstanceSelectorsEqual,
  type InstanceSelector,
} from "~/shared/instance-utils/tree";

type SelectionAnchor = {
  current: undefined | InstanceSelector;
};

const isElementBeingEdited = (element: Element) => {
  if (element.closest("[contenteditable=true]")) {
    return true;
  }

  return false;
};

const getRenderedInstanceSelectors = () => {
  const selectors: InstanceSelector[] = [];
  for (const element of document.querySelectorAll(`[${selectorIdAttribute}]`)) {
    const selectorId = element.getAttribute(selectorIdAttribute);
    const selector = selectorId?.split(",");
    if (selector === undefined || selector.length === 0) {
      continue;
    }
    if (
      selectors.some((selectedSelector) =>
        areInstanceSelectorsEqual(selectedSelector, selector)
      )
    ) {
      continue;
    }
    selectors.push(selector);
  }
  return selectors;
};

const handleSelect = (
  event: MouseEvent,
  rangeAnchorSelector: SelectionAnchor
) => {
  const element = event.target;

  if (!(element instanceof Element)) {
    return;
  }

  if (isElementBeingEdited(element)) {
    return;
  }

  const instanceSelector = getInstanceSelectorFromElement(element);

  if (instanceSelector === undefined) {
    return;
  }

  // Prevent unnecessary updates (2 clicks are registered before a double click)
  if ($textEditingInstanceSelector.get() !== undefined) {
    $textEditingInstanceSelector.set(undefined);
  }

  if (event.metaKey || event.ctrlKey || event.shiftKey) {
    const nextSelection = getInstanceSelectionUpdate({
      selectedSelectors: $allSelectedInstanceSelectors.get(),
      clickedSelector: instanceSelector,
      orderedSelectors: getRenderedInstanceSelectors(),
      anchorSelector: rangeAnchorSelector.current,
      isToggle: event.metaKey || event.ctrlKey,
      isRange: event.shiftKey,
    });
    selectInstances(nextSelection.selectedSelectors);
    if (nextSelection.selectedSelectors.length !== 1) {
      $ephemeralStyles.set([]);
    }
    rangeAnchorSelector.current = nextSelection.anchorSelector;
    return;
  }

  // Prevent unnecessary updates (2 clicks are registered before a double click)
  if (!shallowEqual(instanceSelector, $selectedInstanceSelector.get())) {
    selectInstance(instanceSelector);
  }
  rangeAnchorSelector.current = instanceSelector;
};

const handleEdit = (
  event: MouseEvent,
  rangeAnchorSelector: SelectionAnchor
) => {
  const element = event.target;

  if (!(element instanceof Element)) {
    return;
  }

  if (isElementBeingEdited(element)) {
    return;
  }

  const instanceSelector = getInstanceSelectorFromElement(element);

  if (instanceSelector === undefined) {
    return;
  }

  const instances = $instances.get();

  let editableInstanceSelector = findClosestRichText({
    instanceSelector,
    instances,
    props: $props.get(),
    metas: $registeredComponentMetas.get(),
    htmlTagsByInstanceId: $propsIndex.get().htmlTagsByInstanceId,
  });

  // Do not allow edit bindable text instances with expression children in Content Mode
  if (editableInstanceSelector !== undefined && $isContentMode.get()) {
    const instance = instances.get(editableInstanceSelector[0]);
    if (instance === undefined) {
      return false;
    }

    const hasExpressionChildren = instance.children.some(
      (child) => child.type === "expression"
    );

    if (hasExpressionChildren) {
      editableInstanceSelector = undefined;
    }
  }

  if (editableInstanceSelector === undefined) {
    // Handle non-editable instances in Content Mode:

    // Reset editing state when clicking from an editable text to a non-editable instance
    if ($textEditingInstanceSelector.get() !== undefined) {
      $textEditingInstanceSelector.set(undefined);
    }

    // Select the instance when no editable parent is found
    if (!shallowEqual(instanceSelector, $selectedInstanceSelector.get())) {
      selectInstance(instanceSelector);
    }
    rangeAnchorSelector.current = instanceSelector;

    return;
  }

  // Avoid redundant selection if the instance is already selected
  if (
    !shallowEqual($selectedInstanceSelector.get(), editableInstanceSelector)
  ) {
    selectInstance(editableInstanceSelector);
  }
  rangeAnchorSelector.current = editableInstanceSelector;

  $hoveredInstanceOutline.set(undefined);
  $hoveredInstanceSelector.set(undefined);

  $textEditingInstanceSelector.set({
    selector: editableInstanceSelector,
    reason: "click",
    mouseX: event.clientX,
    mouseY: event.clientY,
  });
};

export const subscribeInstanceSelection = ({
  signal,
}: {
  signal: AbortSignal;
}) => {
  const rangeAnchorSelector: SelectionAnchor = { current: undefined };

  addEventListener(
    "click",
    (event) => {
      emitCommand("clickCanvas");

      if ($isContentMode.get()) {
        handleEdit(event, rangeAnchorSelector);
        return;
      }

      handleSelect(event, rangeAnchorSelector);
    },
    { passive: true, signal }
  );

  addEventListener(
    "dblclick",
    (event) => {
      handleEdit(event, rangeAnchorSelector);
    },
    { passive: true, signal }
  );
};
