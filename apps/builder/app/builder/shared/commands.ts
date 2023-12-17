import { createCommandsEmitter, type Command } from "~/shared/commands-emitter";
import {
  $dataSources,
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
import {
  deleteInstance,
  findAvailableDataSources,
  getInstancesSlice,
  insertInstancesSliceCopy,
  isInstanceDetachable,
} from "~/shared/instance-utils";
import type { InstanceSelector } from "~/shared/tree-utils";
import { serverSyncStore } from "~/shared/sync";
import { $publisher } from "~/shared/pubsub";
import { $activeSidebarPanel } from "./nano-states";
import { toast } from "@webstudio-is/design-system";

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
  externalCommands: [
    "editInstanceText",
    "formatBold",
    "formatItalic",
    "formatSuperscript",
    "formatSubscript",
    "formatLink",
    "formatSpan",
    "formatClear",
  ],
  commands: [
    // system

    {
      name: "cancelCurrentDrag",
      defaultHotkeys: ["escape"],
      // radix check event.defaultPrevented before invoking callbacks
      preventDefault: false,
      handler: () => {
        const { publish } = $publisher.get();
        publish?.({ type: "cancelCurrentDrag" });
      },
    },
    {
      name: "clickCanvas",
      handler: () => {
        $breakpointsMenuView.set(undefined);
        $activeSidebarPanel.set("none");
      },
    },

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
        const instanceSelector = selectedInstanceSelectorStore.get();
        if (instanceSelector === undefined) {
          return;
        }
        if (isInstanceDetachable(instanceSelector) === false) {
          toast.error(
            "This instance can not be moved outside of its parent component."
          );
          return;
        }
        // @todo tell user they can't copy or cut root
        if (instanceSelector.length === 1) {
          return;
        }
        // body is not allowed to copy
        // so clipboard always have at least two level instance selector
        const [targetInstanceId, parentInstanceId] = instanceSelector;
        const parentInstanceSelector = instanceSelector.slice(1);
        const slice = getInstancesSlice(targetInstanceId);
        insertInstancesSliceCopy({
          slice,
          availableDataSources: findAvailableDataSources(
            $dataSources.get(),
            parentInstanceSelector
          ),
          beforeTransactionEnd: (rootInstanceId, draft) => {
            const parentInstance = draft.instances.get(parentInstanceId);
            if (parentInstance === undefined) {
              return;
            }
            // put after current instance
            const indexWithinChildren = parentInstance.children.findIndex(
              (child) => child.type === "id" && child.value === targetInstanceId
            );
            const position = indexWithinChildren + 1;
            parentInstance.children.splice(position, 0, {
              type: "id",
              value: rootInstanceId,
            });
            // select new instance
            selectedInstanceSelectorStore.set([
              rootInstanceId,
              ...parentInstanceSelector,
            ]);
          },
        });
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

    // history

    {
      name: "undo",
      // safari use cmd+z to reopen closed tabs, here added ctrl as alternative
      defaultHotkeys: ["meta+z", "ctrl+z"],
      disableHotkeyOnContentEditable: true,
      disableHotkeyOnFormTags: true,
      handler: () => {
        serverSyncStore.undo();
      },
    },
    {
      name: "redo",
      // safari use cmd+z to reopen closed tabs, here added ctrl as alternative
      defaultHotkeys: ["meta+shift+z", "ctrl+shift+z"],
      disableHotkeyOnContentEditable: true,
      disableHotkeyOnFormTags: true,
      handler: () => {
        serverSyncStore.redo();
      },
    },
  ],
});
