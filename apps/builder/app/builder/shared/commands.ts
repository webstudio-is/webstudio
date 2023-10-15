import { createCommandsEmitter, type Command } from "~/shared/commands-emitter";
import {
  $isPreviewMode,
  editingItemIdStore,
  instancesStore,
  selectedInstanceSelectorStore,
  selectedStyleSourceSelectorStore,
  textEditingInstanceSelectorStore,
} from "~/shared/nano-states";
import {
  $breakpointsMenuView,
  selectBreakpointByOrder,
} from "~/shared/breakpoints";
import { onCopy, onPaste } from "~/shared/copy-paste/plugin-instance";
import { deleteInstance } from "~/shared/instance-utils";
import type { InstanceSelector } from "~/shared/tree-utils";

const makeBreakpointCommand = <CommandName extends string>(
  name: CommandName,
  number: number
): Command<CommandName> => ({
  name,
  defaultHotkeys: [`meta+${number}`, `ctrl+${number}`],
  handler: () => {
    selectBreakpointByOrder(number);
  },
});

const deleteSelectedInstance = () => {
  const textEditingInstanceSelector = textEditingInstanceSelectorStore.get();
  const selectedInstanceSelector = selectedInstanceSelectorStore.get();
  // cannot delete instance while editing
  if (textEditingInstanceSelector) {
    return;
  }
  if (selectedInstanceSelector === undefined) {
    return;
  }
  if (selectedInstanceSelector.length === 1) {
    return;
  }
  let newSelectedInstanceSelector: undefined | InstanceSelector;
  const instances = instancesStore.get();
  const [selectedInstanceId, parentInstanceId] = selectedInstanceSelector;
  const parentInstance = instances.get(parentInstanceId);
  if (parentInstance) {
    const siblingIds = parentInstance.children
      .filter((child) => child.type === "id")
      .map((child) => child.value);
    const position = siblingIds.indexOf(selectedInstanceId);
    const siblingId = siblingIds[position + 1] ?? siblingIds[position - 1];
    if (siblingId) {
      // select next or previous sibling if possible
      newSelectedInstanceSelector = [
        siblingId,
        ...selectedInstanceSelector.slice(1),
      ];
    } else {
      // fallback to parent
      newSelectedInstanceSelector = selectedInstanceSelector.slice(1);
    }
  }
  if (deleteInstance(selectedInstanceSelector)) {
    selectedInstanceSelectorStore.set(newSelectedInstanceSelector);
    selectedStyleSourceSelectorStore.set(undefined);
  }
};

export const { emitCommand, subscribeCommands } = createCommandsEmitter({
  source: "builder",
  externalCommands: ["editInstanceText"],
  commands: [
    // ui

    {
      name: "togglePreview",
      defaultHotkeys: ["meta+shift+p", "ctrl+shift+p"],
      handler: () => {
        $isPreviewMode.set($isPreviewMode.get() === false);
      },
    },
    {
      name: "openBreakpointsMenu",
      defaultHotkeys: ["meta+b", "ctrl+b"],
      handler: () => {
        $breakpointsMenuView.set("initial");
      },
    },
    makeBreakpointCommand("selectBreakpoint1", 1),
    makeBreakpointCommand("selectBreakpoint2", 2),
    makeBreakpointCommand("selectBreakpoint3", 3),
    makeBreakpointCommand("selectBreakpoint4", 4),
    makeBreakpointCommand("selectBreakpoint5", 5),
    makeBreakpointCommand("selectBreakpoint6", 6),
    makeBreakpointCommand("selectBreakpoint7", 7),
    makeBreakpointCommand("selectBreakpoint8", 8),
    makeBreakpointCommand("selectBreakpoint9", 9),

    // instances

    {
      name: "deleteInstance",
      defaultHotkeys: ["backspace", "delete"],
      disableHotkeyOnContentEditable: true,
      // this disables hotkey for inputs on style panel
      // but still work for input on canvas which call event.preventDefault() in keydown handler
      disableHotkeyOnFormTags: true,
      handler: deleteSelectedInstance,
    },
    {
      name: "duplicateInstance",
      defaultHotkeys: ["meta+d", "ctrl+d"],
      handler: () => {
        onPaste(onCopy() ?? "");
      },
    },
    {
      name: "editInstanceLabel",
      defaultHotkeys: ["meta+e", "ctrl+e"],
      handler: () => {
        const selectedInstanceSelector = selectedInstanceSelectorStore.get();
        if (selectedInstanceSelector === undefined) {
          return;
        }
        const [targetInstanceId] = selectedInstanceSelector;
        editingItemIdStore.set(targetInstanceId);
      },
    },

    /*
    // @todo: decide about keyboard shortcut, uncomment when ready
    {
      name: "toggleAiCommandBar",
      defaultHotkeys: ["space"],
      disableHotkeyOnContentEditable: true,
      // this disables hotkey for inputs on style panel
      // but still work for input on canvas which call event.preventDefault() in keydown handler
      disableHotkeyOnFormTags: true,
      handler: () => {
        $isAiCommandBarVisible.set($isAiCommandBarVisible.get() === false);
      },
    },
    */
  ],
});
