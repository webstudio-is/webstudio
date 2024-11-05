import { getInstanceSelectorFromElement } from "~/shared/dom-utils";
import { findClosestEditableInstanceSelector } from "~/shared/instance-utils";
import {
  $instances,
  $registeredComponentMetas,
  $selectedInstanceSelector,
} from "~/shared/nano-states";
import { $textEditingInstanceSelector } from "~/shared/nano-states";
import { emitCommand } from "./shared/commands";
import { shallowEqual } from "shallow-equal";

const isElementBeingEdited = (element: Element) => {
  if (element.closest("[contenteditable=true]")) {
    return true;
  }

  return false;
};

export const subscribeInstanceSelection = ({
  signal,
}: {
  signal: AbortSignal;
}) => {
  addEventListener(
    "click",
    (event) => {
      const element = event.target;

      emitCommand("clickCanvas");

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
      if (!shallowEqual(instanceSelector, $selectedInstanceSelector.get())) {
        $selectedInstanceSelector.set(instanceSelector);
      }
    },
    { passive: true, signal }
  );

  addEventListener(
    "dblclick",
    (event) => {
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

      const editableInstanceSelector = findClosestEditableInstanceSelector(
        instanceSelector,
        $instances.get(),
        $registeredComponentMetas.get()
      );

      if (editableInstanceSelector === undefined) {
        return;
      }

      // Prevent unnecessary updates (should already be selected during click)
      if (!shallowEqual(instanceSelector, editableInstanceSelector)) {
        $selectedInstanceSelector.set(editableInstanceSelector);
      }

      $textEditingInstanceSelector.set({
        selector: editableInstanceSelector,
        reason: "click",
        mouseX: event.clientX,
        mouseY: event.clientY,
      });
    },
    { passive: true, signal }
  );
};
