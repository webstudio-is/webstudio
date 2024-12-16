import { nanoid } from "nanoid";
import { blockTemplateComponent } from "@webstudio-is/react-sdk";
import type { Instance } from "@webstudio-is/sdk";
import { toast } from "@webstudio-is/design-system";
import { createCommandsEmitter, type Command } from "~/shared/commands-emitter";
import {
  $editingItemSelector,
  $instances,
  $selectedInstanceSelector,
  $textEditingInstanceSelector,
  $isDesignMode,
  toggleBuilderMode,
  $isPreviewMode,
  $isContentMode,
  $registeredComponentMetas,
} from "~/shared/nano-states";
import {
  $breakpointsMenuView,
  selectBreakpointByOrder,
} from "~/shared/breakpoints";
import {
  deleteInstanceMutable,
  findAvailableDataSources,
  extractWebstudioFragment,
  insertWebstudioFragmentCopy,
  updateWebstudioData,
  isInstanceDetachable,
} from "~/shared/instance-utils";
import type { InstanceSelector } from "~/shared/tree-utils";
import { serverSyncStore } from "~/shared/sync";
import { $publisher } from "~/shared/pubsub";
import {
  $activeInspectorPanel,
  setActiveSidebarPanel,
  toggleActiveSidebarPanel,
} from "./nano-states";
import {
  $parentInstance,
  $selectedInstance,
  selectInstance,
} from "~/shared/awareness";
import { openCommandPanel } from "../features/command-panel";
import { builderApi } from "~/shared/builder-api";
import { findBlockSelector } from "../features/workspace/canvas-tools/outline/block-instance-outline";
import {
  findClosestNonTextualContainer,
  isTreeMatching,
} from "~/shared/matcher";

const makeBreakpointCommand = <CommandName extends string>(
  name: CommandName,
  number: number
): Command<CommandName> => ({
  name,
  hidden: true,
  defaultHotkeys: [`${number}`],
  disableHotkeyOnFormTags: true,
  disableHotkeyOnContentEditable: true,
  handler: () => {
    selectBreakpointByOrder(number);
  },
});

export const deleteSelectedInstance = () => {
  if ($isPreviewMode.get()) {
    builderApi.toast.info("Deleting is not allowed in preview mode.");
    return;
  }
  const textEditingInstanceSelector = $textEditingInstanceSelector.get();
  const selectedInstanceSelector = $selectedInstanceSelector.get();
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
  const instances = $instances.get();
  if (isInstanceDetachable(instances, selectedInstanceSelector) === false) {
    toast.error(
      "This instance can not be moved outside of its parent component."
    );
    return false;
  }

  if ($isContentMode.get()) {
    // In content mode we are allowing to delete childen of the editable block
    const editableInstanceSelector = findBlockSelector(
      selectedInstanceSelector,
      instances
    );
    if (editableInstanceSelector === undefined) {
      builderApi.toast.info("You can't delete this instance in conent mode.");
      return;
    }

    const isChildOfBlock =
      selectedInstanceSelector.length - editableInstanceSelector.length === 1;

    const isTemplateInstance =
      instances.get(selectedInstanceSelector[0])?.component ===
      blockTemplateComponent;

    if (isTemplateInstance) {
      builderApi.toast.info("You can't delete this instance in conent mode.");
      return;
    }

    if (!isChildOfBlock) {
      builderApi.toast.info("You can't delete this instance in conent mode.");
      return;
    }
  }

  let newSelectedInstanceSelector: undefined | InstanceSelector;
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
  updateWebstudioData((data) => {
    if (deleteInstanceMutable(data, selectedInstanceSelector)) {
      selectInstance(newSelectedInstanceSelector);
    }
  });
};

export const wrapIn = (component: string) => {
  const selectedInstance = $selectedInstance.get();
  const parentInstanceId = $parentInstance.get()?.id;
  // global root or body are selected
  if (selectedInstance === undefined || parentInstanceId === undefined) {
    return;
  }
  const selectedInstanceSelector = $selectedInstanceSelector.get();
  if (selectedInstanceSelector === undefined) {
    return;
  }
  const newInstanceId = nanoid();
  const parentInstanceSelector = selectedInstanceSelector.slice(1);
  const newInstanceSelector = [newInstanceId, ...parentInstanceSelector];
  const metas = $registeredComponentMetas.get();
  try {
    updateWebstudioData((data) => {
      const meta = metas.get(selectedInstance.component);
      if (meta?.type === "rich-text-child") {
        toast.error(`Cannot wrap textual content`);
        throw Error("Abort transaction");
      }
      const newInstance: Instance = {
        type: "instance",
        id: newInstanceId,
        component,
        children: [{ type: "id", value: selectedInstance.id }],
      };
      const parentInstance = data.instances.get(parentInstanceId);
      data.instances.set(newInstanceId, newInstance);
      if (parentInstance) {
        for (const child of parentInstance.children) {
          if (child.type === "id" && child.value === selectedInstance.id) {
            child.value = newInstanceId;
          }
        }
      }
      const matches = isTreeMatching({
        metas,
        instances: data.instances,
        instanceSelector: newInstanceSelector,
      });
      if (matches === false) {
        toast.error(`Cannot wrap in "${component}"`);
        throw Error("Abort transaction");
      }
    });
    selectInstance(newInstanceSelector);
  } catch {
    // do nothing
  }
};

export const unwrap = () => {
  const selectedInstanceId = $selectedInstance.get()?.id;
  const parentInstanceId = $parentInstance.get()?.id;
  // global root or body are selected
  if (selectedInstanceId === undefined || parentInstanceId === undefined) {
    return;
  }
  const selectedInstanceSelector = $selectedInstanceSelector.get();
  if (selectedInstanceSelector === undefined) {
    return;
  }
  const parentInstanceSelector = selectedInstanceSelector.slice(1);
  try {
    updateWebstudioData((data) => {
      const nonTextualIndex = findClosestNonTextualContainer({
        metas: $registeredComponentMetas.get(),
        instances: data.instances,
        instanceSelector: selectedInstanceSelector,
      });
      if (nonTextualIndex !== 0) {
        toast.error(`Cannot unwrap textual instance`);
        throw Error("Abort transaction");
      }
      const parentInstance = data.instances.get(parentInstanceId);
      const selectedInstance = data.instances.get(selectedInstanceId);
      data.instances.delete(selectedInstanceId);
      if (parentInstance && selectedInstance) {
        const index = parentInstance.children.findIndex(
          (child) => child.type === "id" && child.value === selectedInstanceId
        );
        parentInstance.children.splice(index, 1, ...selectedInstance.children);
      }
      const matches = isTreeMatching({
        metas: $registeredComponentMetas.get(),
        instances: data.instances,
        instanceSelector: parentInstanceSelector,
      });
      if (matches === false) {
        toast.error(`Cannot unwrap instance`);
        throw Error("Abort transaction");
      }
    });
    selectInstance(parentInstanceSelector);
  } catch {
    // do nothing
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
      hidden: true,
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
      hidden: true,
      handler: () => {
        $breakpointsMenuView.set(undefined);
        setActiveSidebarPanel("auto");
      },
    },

    // ui

    {
      name: "togglePreviewMode",
      defaultHotkeys: ["meta+shift+p", "ctrl+shift+p"],
      handler: () => {
        setActiveSidebarPanel("auto");
        toggleBuilderMode("preview");
      },
    },
    {
      name: "toggleDesignMode",
      defaultHotkeys: ["meta+shift+d", "ctrl+shift+d"],
      handler: () => {
        setActiveSidebarPanel("auto");
        toggleBuilderMode("design");
      },
    },
    {
      name: "toggleContentMode",
      defaultHotkeys: ["meta+shift+c", "ctrl+shift+c"],
      handler: () => {
        setActiveSidebarPanel("auto");
        toggleBuilderMode("content");
      },
    },
    {
      name: "openBreakpointsMenu",
      handler: () => {
        $breakpointsMenuView.set("initial");
      },
    },
    {
      name: "toggleComponentsPanel",
      defaultHotkeys: ["a"],
      handler: () => {
        if ($isDesignMode.get() === false) {
          builderApi.toast.info(
            "Components panel is only available in design mode."
          );
          return;
        }
        toggleActiveSidebarPanel("components");
      },
      disableHotkeyOnFormTags: true,
      disableHotkeyOnContentEditable: true,
    },
    {
      name: "toggleNavigatorPanel",
      defaultHotkeys: ["z"],
      handler: () => {
        toggleActiveSidebarPanel("navigator");
      },
      disableHotkeyOnFormTags: true,
      disableHotkeyOnContentEditable: true,
    },
    {
      name: "openStylePanel",
      defaultHotkeys: ["s"],
      handler: () => {
        if ($isDesignMode.get() === false) {
          builderApi.toast.info(
            "Style panel is only available in design mode."
          );
          return;
        }
        $activeInspectorPanel.set("style");
      },
      disableHotkeyOnFormTags: true,
      disableHotkeyOnContentEditable: true,
    },
    {
      name: "openSettingsPanel",
      defaultHotkeys: ["d"],
      handler: () => {
        $activeInspectorPanel.set("settings");
      },
      disableHotkeyOnFormTags: true,
      disableHotkeyOnContentEditable: true,
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
        if ($isDesignMode.get() === false) {
          builderApi.toast.info("Duplicating is only allowed in design mode.");
          return;
        }

        const instanceSelector = $selectedInstanceSelector.get();
        if (instanceSelector === undefined) {
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
        updateWebstudioData((data) => {
          const fragment = extractWebstudioFragment(data, targetInstanceId);
          const { newInstanceIds } = insertWebstudioFragmentCopy({
            data,
            fragment,
            availableDataSources: findAvailableDataSources(
              data.dataSources,
              data.instances,
              parentInstanceSelector
            ),
          });
          const newRootInstanceId = newInstanceIds.get(targetInstanceId);
          if (newRootInstanceId === undefined) {
            return;
          }
          const parentInstance = data.instances.get(parentInstanceId);
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
            value: newRootInstanceId,
          });
          // select new instance
          selectInstance([newRootInstanceId, ...parentInstanceSelector]);
        });
      },
    },
    {
      name: "editInstanceLabel",
      defaultHotkeys: ["meta+e", "ctrl+e"],
      handler: () => {
        const selectedInstanceSelector = $selectedInstanceSelector.get();
        if (selectedInstanceSelector === undefined) {
          return;
        }
        $editingItemSelector.set(selectedInstanceSelector);
      },
    },
    {
      name: "wrapInBox",
      handler: () => wrapIn("Box"),
    },
    {
      name: "wrapInLink",
      handler: () => wrapIn("Link"),
    },
    {
      name: "unwrap",
      handler: () => unwrap(),
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

    {
      name: "openCommandPanel",
      hidden: true,
      defaultHotkeys: ["meta+k", "ctrl+k"],
      handler: () => {
        openCommandPanel();
      },
    },
  ],
});
