import { createCommandsEmitter, type Command } from "~/shared/commands-emitter";
import {
  $isPreviewMode,
  editingItemIdStore,
  selectedInstanceSelectorStore,
} from "~/shared/nano-states";
import {
  $breakpointsMenuView,
  selectBreakpointByOrder,
} from "~/shared/breakpoints";
import { onCopy, onPaste } from "~/shared/copy-paste/plugin-instance";
import { deleteSelectedInstance } from "~/shared/instance-utils";

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
      handler: () => {
        deleteSelectedInstance();
      },
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
  ],
});
