import { createCommandsEmitter } from "~/shared/commands-emitter";
import { getElementByInstanceSelector } from "~/shared/dom-utils";
import { findClosestEditableInstanceSelector } from "~/shared/instance-utils";
import {
  instancesStore,
  registeredComponentMetasStore,
  selectedInstanceSelectorStore,
  selectedStyleSourceSelectorStore,
  textEditingInstanceSelectorStore,
} from "~/shared/nano-states";

export const { emitCommand, subscribeCommands } = createCommandsEmitter({
  source: "canvas",
  commands: [
    {
      name: "editInstanceText",
      defaultHotkeys: ["enter"],
      // builder invokes command with custom hotkey setup
      disableHotkeyOutsideApp: true,
      handler: () => {
        const selectedInstanceSelector = selectedInstanceSelectorStore.get();
        if (selectedInstanceSelector === undefined) {
          return;
        }
        const editableInstanceSelector = findClosestEditableInstanceSelector(
          selectedInstanceSelector,
          instancesStore.get(),
          registeredComponentMetasStore.get()
        );
        if (editableInstanceSelector === undefined) {
          return;
        }
        const element = getElementByInstanceSelector(editableInstanceSelector);
        if (element === undefined) {
          return;
        }
        // When an event is triggered from the Builder,
        // the canvas element may be unfocused, so it's important to focus the element on the canvas.
        element.focus();
        selectedInstanceSelectorStore.set(editableInstanceSelector);
        textEditingInstanceSelectorStore.set(editableInstanceSelector);
      },
    },

    {
      name: "escapeSelection",
      defaultHotkeys: ["escape"],
      // reset selection for canvas, but not for the builder
      disableHotkeyOutsideApp: true,
      handler: () => {
        const selectedInstanceSelector = selectedInstanceSelectorStore.get();
        const textEditingInstanceSelector =
          textEditingInstanceSelectorStore.get();
        if (selectedInstanceSelector === undefined) {
          return;
        }
        // exit text editing mode first without unselecting instance
        if (textEditingInstanceSelector) {
          textEditingInstanceSelectorStore.set(undefined);
          return;
        }
        // unselect both instance and style source
        selectedInstanceSelectorStore.set(undefined);
        selectedStyleSourceSelectorStore.set(undefined);
      },
    },
  ],
});
