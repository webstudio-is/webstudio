import { getInstanceSelectorFromElement } from "~/shared/dom-utils";
import { findClosestEditableInstanceSelector } from "~/shared/instance-utils";
import {
  $hoveredInstanceOutline,
  $hoveredInstanceSelector,
  $instances,
  $isContentMode,
  $registeredComponentMetas,
} from "~/shared/nano-states";
import { $textEditingInstanceSelector } from "~/shared/nano-states";
import { emitCommand } from "./shared/commands";
import { shallowEqual } from "shallow-equal";
import { $awareness, selectInstance } from "~/shared/awareness";

const isElementBeingEdited = (element: Element) => {
  if (element.closest("[contenteditable=true]")) {
    return true;
  }

  return false;
};

const handleSelect = (event: MouseEvent) => {
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

  // Prevent unnecessary updates (2 clicks are registered before a double click)
  if (!shallowEqual(instanceSelector, $awareness.get()?.instanceSelector)) {
    selectInstance(instanceSelector);
  }
};

const handleEdit = (event: MouseEvent) => {
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

  let editableInstanceSelector = findClosestEditableInstanceSelector(
    instanceSelector,
    instances,
    $registeredComponentMetas.get()
  );

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
    if (!shallowEqual(instanceSelector, $awareness.get()?.instanceSelector)) {
      selectInstance(instanceSelector);
    }

    return;
  }

  // Avoid redundant selection if the instance is already selected
  if (
    !shallowEqual($awareness.get()?.instanceSelector, editableInstanceSelector)
  ) {
    selectInstance(editableInstanceSelector);
  }

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
  addEventListener(
    "click",
    (event) => {
      emitCommand("clickCanvas");

      if ($isContentMode.get()) {
        handleEdit(event);
        return;
      }

      handleSelect(event);
    },
    { passive: true, signal }
  );

  addEventListener(
    "dblclick",
    (event) => {
      handleEdit(event);
    },
    { passive: true, signal }
  );
};
