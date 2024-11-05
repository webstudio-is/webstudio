import { getInstanceSelectorFromElement } from "~/shared/dom-utils";
import { findClosestEditableInstanceSelector } from "~/shared/instance-utils";
import {
  $instances,
  $registeredComponentMetas,
  $selectedInstanceSelector,
} from "~/shared/nano-states";
import { $textEditingInstanceSelector } from "~/shared/nano-states";
import { emitCommand } from "./shared/commands";
import deepEqual from "fast-deep-equal";

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

      if (element === null || !(element instanceof Element)) {
        return;
      }

      if (element.closest("[contenteditable=true]")) {
        return;
      }

      const instanceSelector = getInstanceSelectorFromElement(element);
      if (instanceSelector === undefined) {
        return;
      }

      if ($textEditingInstanceSelector.get() !== undefined) {
        $textEditingInstanceSelector.set(undefined);
      }

      if (deepEqual(instanceSelector, $selectedInstanceSelector.get())) {
        return;
      }

      $selectedInstanceSelector.set(instanceSelector);
    },
    { passive: true, signal }
  );

  addEventListener(
    "dblclick",
    (event) => {
      const element = event.target;

      if (element === null || !(element instanceof Element)) {
        return;
      }

      if (element.closest("[contenteditable=true]")) {
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

      if (!deepEqual(instanceSelector, editableInstanceSelector)) {
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
