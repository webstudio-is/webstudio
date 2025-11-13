import { nanoid } from "nanoid";
import {
  blockTemplateComponent,
  elementComponent,
  isComponentDetachable,
} from "@webstudio-is/sdk";
import type { Instance } from "@webstudio-is/sdk";
import { toast } from "@webstudio-is/design-system";
import { createCommandsEmitter, type Command } from "~/shared/commands-emitter";
import {
  $editingItemSelector,
  $instances,
  $textEditingInstanceSelector,
  $isDesignMode,
  toggleBuilderMode,
  $isPreviewMode,
  $isContentMode,
  $registeredComponentMetas,
  findBlockSelector,
  $project,
} from "~/shared/nano-states";
import {
  $breakpointsMenuView,
  selectBreakpointByOrder,
} from "~/shared/breakpoints";
import {
  deleteInstanceMutable,
  extractWebstudioFragment,
  insertWebstudioFragmentAt,
  insertWebstudioFragmentCopy,
  updateWebstudioData,
} from "~/shared/instance-utils";
import type { InstanceSelector } from "~/shared/tree-utils";
import { serverSyncStore } from "~/shared/sync";
import { $publisher } from "~/shared/pubsub";
import {
  $activeInspectorPanel,
  $publishDialog,
  setActiveSidebarPanel,
  toggleActiveSidebarPanel,
} from "./nano-states";
import { $selectedInstancePath, selectInstance } from "~/shared/awareness";
import { openCommandPanel } from "../features/command-panel";
import { builderApi } from "~/shared/builder-api";
import { getSetting, setSetting } from "./client-settings";
import { findAvailableVariables } from "~/shared/data-variables";
import { atom } from "nanostores";
import {
  findClosestNonTextualContainer,
  isRichTextContent,
  isTreeSatisfyingContentModel,
} from "~/shared/content-model";
import { generateFragmentFromHtml } from "~/shared/html";
import { generateFragmentFromTailwind } from "~/shared/tailwind/tailwind";
import { denormalizeSrcProps } from "~/shared/copy-paste/asset-upload";
import { getInstanceLabel } from "./instance-label";
import { $instanceTags } from "../features/style-panel/shared/model";
import { reactPropsToStandardAttributes } from "@webstudio-is/react-sdk";
import { isSyncIdle } from "./sync/sync-server";

export const $styleSourceInputElement = atom<HTMLInputElement | undefined>();

const makeBreakpointCommand = <CommandName extends string>(
  name: CommandName,
  number: number
): Command<CommandName> => ({
  name,
  hidden: true,
  defaultHotkeys: [`${number}`],
  disableOnInputLikeControls: true,
  handler: () => {
    selectBreakpointByOrder(number);
  },
});

export const deleteSelectedInstance = () => {
  if ($isPreviewMode.get()) {
    return;
  }
  const textEditingInstanceSelector = $textEditingInstanceSelector.get();
  const instancePath = $selectedInstancePath.get();
  // cannot delete instance while editing
  if (textEditingInstanceSelector) {
    return;
  }
  if (instancePath === undefined || instancePath.length === 1) {
    return;
  }
  const [selectedItem, parentItem] = instancePath;
  const selectedInstanceSelector = selectedItem.instanceSelector;
  const instances = $instances.get();
  if (!isComponentDetachable(selectedItem.instance.component)) {
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
      builderApi.toast.info("You can't delete this instance in content mode.");
      return;
    }

    if (!isChildOfBlock) {
      builderApi.toast.info("You can't delete this instance in content mode.");
      return;
    }
  }

  // find next selected instance
  let newSelectedInstanceSelector: undefined | InstanceSelector;
  const parentInstanceSelector = parentItem.instanceSelector;
  const siblingIds = parentItem.instance.children
    .filter((child) => child.type === "id")
    .map((child) => child.value);
  const position = siblingIds.indexOf(selectedItem.instance.id);
  const siblingId = siblingIds[position + 1] ?? siblingIds[position - 1];
  if (siblingId) {
    // select next or previous sibling if possible
    newSelectedInstanceSelector = [siblingId, ...parentInstanceSelector];
  } else {
    // fallback to parent
    newSelectedInstanceSelector = parentInstanceSelector;
  }
  updateWebstudioData((data) => {
    if (deleteInstanceMutable(data, instancePath)) {
      selectInstance(newSelectedInstanceSelector);
    }
  });
};

export const wrapIn = (component: string, tag?: string) => {
  const instancePath = $selectedInstancePath.get();
  // global root or body are selected
  if (instancePath === undefined || instancePath.length === 1) {
    return;
  }
  const [selectedItem, parentItem] = instancePath;
  const selectedInstance = selectedItem.instance;
  const newInstanceId = nanoid();
  const newInstanceSelector = [newInstanceId, ...parentItem.instanceSelector];
  const metas = $registeredComponentMetas.get();
  try {
    updateWebstudioData((data) => {
      const isContent = isRichTextContent({
        instanceSelector: selectedItem.instanceSelector,
        instances: data.instances,
        props: data.props,
        metas,
      });
      if (isContent) {
        toast.error(`Cannot wrap textual content`);
        throw Error("Abort transaction");
      }
      const newInstance: Instance = {
        type: "instance",
        id: newInstanceId,
        component,
        children: [{ type: "id", value: selectedInstance.id }],
      };
      if (tag || component === elementComponent) {
        newInstance.tag = tag ?? "div";
      }
      const parentInstance = data.instances.get(parentItem.instance.id);
      data.instances.set(newInstanceId, newInstance);
      if (parentInstance) {
        for (const child of parentInstance.children) {
          if (child.type === "id" && child.value === selectedInstance.id) {
            child.value = newInstanceId;
          }
        }
      }
      const isSatisfying = isTreeSatisfyingContentModel({
        instances: data.instances,
        props: data.props,
        metas,
        instanceSelector: newInstanceSelector,
      });
      if (isSatisfying === false) {
        const label = getInstanceLabel({ component, tag }, {});
        toast.error(`Cannot wrap in ${label}`);
        throw Error("Abort transaction");
      }
    });
    selectInstance(newInstanceSelector);
  } catch {
    // do nothing
  }
};

export const replaceWith = (component: string, tag?: string) => {
  const instancePath = $selectedInstancePath.get();
  // global root or body are selected
  if (instancePath === undefined || instancePath.length === 1) {
    return;
  }
  const [selectedItem] = instancePath;
  const selectedInstance = selectedItem.instance;
  const selectedInstanceSelector = selectedItem.instanceSelector;
  const metas = $registeredComponentMetas.get();
  const instanceTags = $instanceTags.get();
  try {
    updateWebstudioData((data) => {
      const instance = data.instances.get(selectedInstance.id);
      if (instance === undefined) {
        return;
      }
      instance.component = component;
      // replace with specified tag or with currently used
      if (tag || component === elementComponent) {
        instance.tag = tag ?? instanceTags.get(selectedInstance.id) ?? "div";
        // delete legacy tag prop if specified
        for (const prop of data.props.values()) {
          if (prop.instanceId !== selectedInstance.id) {
            continue;
          }
          if (prop.name === "tag") {
            data.props.delete(prop.id);
            continue;
          }
          const newName = reactPropsToStandardAttributes[prop.name];
          if (newName) {
            const newId = `${prop.instanceId}:${newName}`;
            data.props.delete(prop.id);
            data.props.set(newId, { ...prop, id: newId, name: newName });
          }
        }
      }
      const isSatisfying = isTreeSatisfyingContentModel({
        instances: data.instances,
        props: data.props,
        metas,
        instanceSelector: selectedInstanceSelector,
      });
      if (isSatisfying === false) {
        const label = getInstanceLabel({ component, tag }, {});
        toast.error(`Cannot replace with ${label}`);
        throw Error("Abort transaction");
      }
    });
  } catch {
    // do nothing
  }
};

export const unwrap = () => {
  const instancePath = $selectedInstancePath.get();
  // global root or body are selected
  if (instancePath === undefined || instancePath.length === 1) {
    return;
  }
  const [selectedItem, parentItem] = instancePath;
  try {
    updateWebstudioData((data) => {
      const instanceSelector = findClosestNonTextualContainer({
        metas: $registeredComponentMetas.get(),
        props: data.props,
        instances: data.instances,
        instanceSelector: selectedItem.instanceSelector,
      });
      if (selectedItem.instanceSelector.join() !== instanceSelector.join()) {
        toast.error(`Cannot unwrap textual instance`);
        throw Error("Abort transaction");
      }
      const parentInstance = data.instances.get(parentItem.instance.id);
      const selectedInstance = data.instances.get(selectedItem.instance.id);
      data.instances.delete(selectedItem.instance.id);
      if (parentInstance && selectedInstance) {
        const index = parentInstance.children.findIndex(
          (child) =>
            child.type === "id" && child.value === selectedItem.instance.id
        );
        parentInstance.children.splice(index, 1, ...selectedInstance.children);
      }
      const matches = isTreeSatisfyingContentModel({
        instances: data.instances,
        props: data.props,
        metas: $registeredComponentMetas.get(),
        instanceSelector: parentItem.instanceSelector,
      });
      if (matches === false) {
        toast.error(`Cannot unwrap instance`);
        throw Error("Abort transaction");
      }
    });
    selectInstance(parentItem.instanceSelector);
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
      name: "openPublishDialog",
      defaultHotkeys: ["shift+P"],
      handler: () => {
        $publishDialog.set("publish");
      },
      disableOnInputLikeControls: true,
    },
    {
      name: "openExportDialog",
      defaultHotkeys: ["shift+E"],
      handler: () => {
        $publishDialog.set("export");
      },
      disableOnInputLikeControls: true,
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
      disableOnInputLikeControls: true,
    },
    {
      name: "toggleNavigatorPanel",
      defaultHotkeys: ["z"],
      handler: () => {
        toggleActiveSidebarPanel("navigator");
      },
      disableOnInputLikeControls: true,
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
      disableOnInputLikeControls: true,
    },
    {
      name: "focusStyleSources",
      defaultHotkeys: ["meta+enter", "ctrl+enter"],
      handler: () => {
        if ($isDesignMode.get() === false) {
          builderApi.toast.info(
            "Style panel is only available in design mode."
          );
          return;
        }
        $activeInspectorPanel.set("style");
        requestAnimationFrame(() => {
          $styleSourceInputElement.get()?.focus();
        });
      },
      disableOnInputLikeControls: true,
    },
    {
      name: "toggleStylePanelFocusMode",
      defaultHotkeys: ["alt+shift+s"],
      handler: () => {
        setSetting(
          "stylePanelMode",
          getSetting("stylePanelMode") === "focus" ? "default" : "focus"
        );
      },
      disableOnInputLikeControls: true,
    },
    {
      name: "toggleStylePanelAdvancedMode",
      defaultHotkeys: ["alt+shift+a"],
      handler: () => {
        setSetting(
          "stylePanelMode",
          getSetting("stylePanelMode") === "advanced" ? "default" : "advanced"
        );
      },
      disableOnInputLikeControls: true,
    },
    {
      name: "openSettingsPanel",
      defaultHotkeys: ["d"],
      handler: () => {
        $activeInspectorPanel.set("settings");
      },
      disableOnInputLikeControls: true,
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
      // this disables hotkey for inputs on style panel
      // but still work for input on canvas which call event.preventDefault() in keydown handler
      disableOnInputLikeControls: true,
      handler: () => {
        $isAiCommandBarVisible.set($isAiCommandBarVisible.get() === false);
      },
    },
    */

    {
      name: "deleteInstanceBuilder",
      label: "Delete Instance",
      defaultHotkeys: ["backspace", "delete"],
      // See "deleteInstanceCanvas" for details on why the command is separated for the canvas and builder.
      disableHotkeyOutsideApp: true,
      disableOnInputLikeControls: true,
      handler: deleteSelectedInstance,
    },
    {
      name: "duplicateInstance",
      defaultHotkeys: ["meta+d", "ctrl+d"],
      handler: () => {
        const project = $project.get();
        if (project === undefined) {
          return;
        }
        if ($isDesignMode.get() === false) {
          builderApi.toast.info("Duplicating is only allowed in design mode.");
          return;
        }
        const instancePath = $selectedInstancePath.get();
        // global root or body are selected
        if (instancePath === undefined || instancePath.length === 1) {
          return;
        }
        const [selectedItem, parentItem] = instancePath;

        updateWebstudioData((data) => {
          const fragment = extractWebstudioFragment(
            data,
            selectedItem.instance.id
          );
          const { newInstanceIds } = insertWebstudioFragmentCopy({
            data,
            fragment,
            availableVariables: findAvailableVariables({
              ...data,
              startingInstanceId: parentItem.instanceSelector[0],
            }),
            projectId: project.id,
          });
          const newRootInstanceId = newInstanceIds.get(
            selectedItem.instance.id
          );
          if (newRootInstanceId === undefined) {
            return;
          }
          const parentInstance = data.instances.get(parentItem.instance.id);
          if (parentInstance === undefined) {
            return;
          }
          // put after current instance
          const indexWithinChildren = parentInstance.children.findIndex(
            (child) =>
              child.type === "id" && child.value === selectedItem.instance.id
          );
          const position = indexWithinChildren + 1;
          parentInstance.children.splice(position, 0, {
            type: "id",
            value: newRootInstanceId,
          });
          // select new instance
          selectInstance([newRootInstanceId, ...parentItem.instanceSelector]);
        });
      },
    },
    {
      name: "editInstanceLabel",
      defaultHotkeys: ["meta+e", "ctrl+e"],
      handler: () => {
        const instancePath = $selectedInstancePath.get();
        if (instancePath === undefined) {
          return;
        }
        const [selectedItem] = instancePath;
        $editingItemSelector.set(selectedItem.instanceSelector);
      },
    },
    {
      name: "wrapInElement",
      label: "Wrap in an Element",
      handler: () => wrapIn(elementComponent),
    },
    {
      name: "wrapInLink",
      label: "Wrap in a Link",
      handler: () => wrapIn(elementComponent, "a"),
    },
    {
      name: "unwrap",
      handler: () => unwrap(),
    },
    {
      name: "replaceWithElement",
      label: "Replace with an Element",
      handler: () => replaceWith(elementComponent),
    },
    {
      name: "replaceWithLink",
      label: "Replace with a Link",
      handler: () => replaceWith(elementComponent, "a"),
    },

    {
      name: "pasteTailwind",
      label: "Paste HTML with Tailwind classes",
      handler: async () => {
        const html = await navigator.clipboard.readText();
        let fragment = generateFragmentFromHtml(html);
        fragment = await denormalizeSrcProps(fragment);
        fragment = await generateFragmentFromTailwind(fragment);
        return insertWebstudioFragmentAt(fragment);
      },
    },

    // history

    {
      name: "undo",
      // safari use meta+z to reopen closed tabs, here added ctrl as alternative
      defaultHotkeys: ["meta+z", "ctrl+z"],
      disableOnInputLikeControls: true,
      handler: () => {
        serverSyncStore.undo();
      },
    },
    {
      name: "redo",
      // safari use meta+z to reopen closed tabs, here added ctrl as alternative
      defaultHotkeys: ["meta+shift+z", "ctrl+shift+z"],
      disableOnInputLikeControls: true,
      handler: () => {
        serverSyncStore.redo();
      },
    },

    {
      name: "save",
      defaultHotkeys: ["meta+s", "ctrl+s"],
      handler: async () => {
        toast.dismiss("save-success");
        try {
          await isSyncIdle();
          toast.success("Project saved successfully", { id: "save-success" });
        } catch (error) {
          if (error instanceof Error) {
            toast.error(error.message);
          }
        }
      },
    },

    {
      name: "openCommandPanel",
      hidden: true,
      defaultHotkeys: ["meta+k", "ctrl+k"],
      handler: () => {
        if ($isDesignMode.get()) {
          openCommandPanel();
        }
      },
    },
  ],
});
