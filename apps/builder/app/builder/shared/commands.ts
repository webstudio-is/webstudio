import { toast } from "@webstudio-is/design-system";
import { type WebstudioFragment } from "@webstudio-is/sdk";
import {
  isAutoGridPlacement,
  resetGridChildPlacement,
} from "~/builder/features/style-panel/sections/layout/shared/grid-utils";
import {
  duplicateFolder,
  duplicatePage,
  duplicateTemplate,
} from "~/builder/features/pages/page-utils";
import { createCommandsEmitter, type Command } from "~/shared/commands-emitter";
import {
  $editingItemSelector,
  $editingPageId,
  $folderIdToDelete,
  $isDesignMode,
  $isPreviewMode,
  $pageIdToDelete,
  $templateIdToDelete,
  toggleBuilderMode,
} from "~/shared/nano-states";
import { $project } from "~/shared/sync/data-stores";

// Declare command for type safety
declare module "~/shared/pubsub" {
  interface CommandRegistry {
    focusStyleSourceInput: undefined;
  }
}

import {
  $breakpointsMenuView,
  selectBreakpointByOrder,
} from "~/shared/breakpoints";
import {
  updateWebstudioData,
  unwrapInstance,
  detachSharedSlotContentMutable,
  deleteSelectedInstance,
  extractWebstudioFragment,
  insertWebstudioFragmentAt,
  insertWebstudioFragmentCopy,
} from "~/shared/instance-utils";
import { serverSyncStore } from "~/shared/sync/sync-stores";
import { $publisher } from "~/shared/pubsub";
import {
  $activeInspectorPanel,
  $isUiHidden,
  $publishDialog,
  setActiveSidebarPanel,
  toggleActiveSidebarPanel,
} from "./nano-states";
import { $selectedInstancePath } from "~/shared/nano-states";
import { selectInstance, selectPage } from "~/shared/nano-states";
import { openCommandPanel } from "../features/command-panel";
import { showWrapComponentsList } from "../features/command-panel/groups/wrap-group";
import { showConvertComponentsList } from "../features/command-panel/groups/convert-group";
import { builderApi } from "~/shared/builder-api";
import { getSetting, setSetting } from "./client-settings";
import { findAvailableVariables } from "~/shared/data-variables";
import { generateFragmentFromHtml } from "~/shared/html";
import { generateFragmentFromTailwind } from "~/shared/tailwind/tailwind";
import { denormalizeSrcProps } from "~/shared/copy-paste/asset-upload";
import { isSyncIdle } from "~/shared/sync/project-queue";
import { openDeleteUnusedTokensDialog } from "~/builder/shared/style-source-actions";
import { openDeleteUnusedDataVariablesDialog } from "~/builder/shared/data-variable-utils";
import { openDeleteUnusedCssVariablesDialog } from "~/builder/shared/css-variable-utils";
import { openDeleteUnusedAssetsDialog } from "~/builder/shared/asset-manager/delete-unused-assets";
import { openKeyboardShortcutsDialog } from "~/builder/features/keyboard-shortcuts-dialog";
import {
  copyFolder,
  copyInstance,
  copyPage,
  copyTemplate,
  emitPaste,
  cutInstance,
} from "~/shared/copy-paste/copy-paste";
import { toggleInstanceShow } from "~/shared/instance-utils";
import {
  getDeletablePageActionTarget,
  getPageActionTarget,
} from "~/shared/page-action-target";

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

const exitPreviewModeFromNonCanvasSource = (source: string) => {
  if (source === "canvas") {
    return;
  }

  setActiveSidebarPanel("auto");
  toggleBuilderMode("preview");
};

const canRunDesignModeCommand = ({ isDesignMode }: { isDesignMode: boolean }) =>
  isDesignMode;

const guardDesignModeCommand = ({
  isDesignMode,
  message,
  toastInfo = builderApi.toast.info,
}: {
  isDesignMode: boolean;
  message: string;
  toastInfo?: (message: string) => void;
}) => {
  if (canRunDesignModeCommand({ isDesignMode })) {
    return true;
  }
  toastInfo(message);
  return false;
};

const copyPageActionTarget = () => {
  if ($isDesignMode.get() === false) {
    return false;
  }
  const target = getPageActionTarget();
  if (target?.type === "page") {
    void copyPage(target.id);
    return true;
  }
  if (target?.type === "folder") {
    void copyFolder(target.id);
    return true;
  }
  if (target?.type === "template") {
    void copyTemplate(target.id);
    return true;
  }
  return false;
};

const duplicatePageActionTarget = () => {
  const target = getPageActionTarget();
  if (target?.type === "page") {
    const newPageId = duplicatePage(target.id);
    if (newPageId) {
      selectPage(newPageId);
    }
    return true;
  }
  if (target?.type === "folder") {
    const newFolderId = duplicateFolder(target.id);
    if (newFolderId) {
      $editingPageId.set(newFolderId);
    }
    return true;
  }
  if (target?.type === "template") {
    const newTemplateId = duplicateTemplate(target.id);
    if (newTemplateId) {
      selectPage(newTemplateId);
    }
    return true;
  }
  return false;
};

export const __testing__ = {
  canRunDesignModeCommand,
  guardDesignModeCommand,
};

const requestSelectedPageItemDelete = () => {
  if ($isDesignMode.get() === false) {
    return false;
  }
  const target = getDeletablePageActionTarget();
  if (target === undefined) {
    return false;
  }
  $pageIdToDelete.set(undefined);
  $folderIdToDelete.set(undefined);
  $templateIdToDelete.set(undefined);
  if (target.type === "page") {
    $pageIdToDelete.set(target.id);
  }
  if (target.type === "folder") {
    $folderIdToDelete.set(target.id);
  }
  if (target.type === "template") {
    $templateIdToDelete.set(target.id);
  }
  return true;
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
      label: "Deselect",
      description: "Cancel drag or deselect",
      hidden: true,
      category: "General",
      defaultHotkeys: ["escape"],
      // radix check event.defaultPrevented before invoking callbacks
      preventDefault: false,
      handler: (source) => {
        if ($isPreviewMode.get()) {
          exitPreviewModeFromNonCanvasSource(source);
          return;
        }

        const { publish } = $publisher.get();
        publish?.({ type: "cancelCurrentDrag" });
      },
    },
    {
      name: "clickCanvas",
      description: "Click on canvas",
      hidden: true,
      handler: () => {
        $breakpointsMenuView.set(undefined);
        setActiveSidebarPanel("auto");
      },
    },

    // ui

    {
      name: "togglePreviewMode",
      description: "Preview mode",
      category: "Top bar",
      defaultHotkeys: ["meta+shift+p", "ctrl+shift+p"],
      handler: () => {
        setActiveSidebarPanel("auto");
        toggleBuilderMode("preview");
      },
    },
    {
      name: "toggleUiHidden",
      description: "Hide UI",
      category: "General",
      defaultHotkeys: ["meta+\\", "ctrl+\\"],
      handler: () => {
        $isUiHidden.set($isUiHidden.get() === false);
      },
    },
    {
      name: "toggleDesignMode",
      description: "Toggle design mode",
      category: "Top bar",
      defaultHotkeys: ["meta+shift+d", "ctrl+shift+d"],
      handler: () => {
        setActiveSidebarPanel("auto");
        toggleBuilderMode("design");
      },
    },
    {
      name: "toggleContentMode",
      description: "Toggle content mode",
      category: "Top bar",
      defaultHotkeys: ["meta+shift+c", "ctrl+shift+c"],
      handler: () => {
        setActiveSidebarPanel("auto");
        toggleBuilderMode("content");
      },
    },
    {
      name: "openBreakpointsMenu",
      description: "Manage responsive breakpoints",
      handler: () => {
        $breakpointsMenuView.set("initial");
      },
    },
    {
      name: "openPublishDialog",
      description: "Deploy your project",
      category: "Top bar",
      defaultHotkeys: ["shift+P"],
      handler: () => {
        $publishDialog.set("publish");
      },
      disableOnInputLikeControls: true,
    },
    {
      name: "openExportDialog",
      description: "Export project code",
      category: "General",
      defaultHotkeys: ["shift+E"],
      handler: () => {
        $publishDialog.set("export");
      },
      disableOnInputLikeControls: true,
    },
    {
      name: "toggleComponentsPanel",
      description: "Toggle components panel",
      category: "Panels",
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
      description: "Toggle navigator panel",
      category: "Panels",
      defaultHotkeys: ["z"],
      handler: () => {
        toggleActiveSidebarPanel("navigator");
      },
      disableOnInputLikeControls: true,
    },
    {
      name: "openStylePanel",
      description: "Open style panel",
      category: "Panels",
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
      description: "Focus style sources input",
      category: "Style panel",
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
          emitCommand("focusStyleSourceInput");
        });
      },
      disableOnInputLikeControls: true,
    },
    {
      name: "focusStyleSourceInput",
      description: "Focus style source input",
      hidden: true,
      handler: () => {
        // This command is handled by the style panel component
        // It's emitted by openStylePanel command
      },
    },
    {
      name: "toggleStylePanelFocusMode",
      description: "Toggle style panel focus mode",
      category: "Style panel",
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
      description: "Toggle style panel advanced mode",
      category: "Style panel",
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
      description: "Open settings panel",
      category: "Panels",
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
    {
      name: "copy",
      description: "Copy selected page or instance",
      category: "Navigator",
      handler: () => {
        if (copyPageActionTarget()) {
          return;
        }
        void copyInstance();
      },
    },
    {
      name: "paste",
      description: "Paste copied instance",
      category: "Navigator",
      handler: () => {
        if (
          guardDesignModeCommand({
            isDesignMode: $isDesignMode.get(),
            message: "Pasting is only allowed in design mode.",
          })
        ) {
          void emitPaste();
        }
      },
    },
    {
      name: "cut",
      description: "Cut selected instance",
      category: "Navigator",
      handler: () => {
        if (
          guardDesignModeCommand({
            isDesignMode: $isDesignMode.get(),
            message: "Cutting is only allowed in design mode.",
          })
        ) {
          void cutInstance();
        }
      },
    },
    {
      name: "toggleShow",
      description: "Toggle instance visibility",
      category: "Navigator",
      handler: () => {
        if (
          guardDesignModeCommand({
            isDesignMode: $isDesignMode.get(),
            message: "Toggling visibility is only allowed in design mode.",
          }) === false
        ) {
          return;
        }
        const instancePath = $selectedInstancePath.get();
        if (instancePath?.[0]) {
          toggleInstanceShow(instancePath[0].instance.id);
        }
      },
    },
    {
      name: "deleteInstanceBuilder",
      label: "Delete",
      description: "Delete selected page or instance",
      category: "Navigator",
      defaultHotkeys: ["backspace", "delete"],
      // See "deleteInstanceCanvas" for details on why the command is separated for the canvas and builder.
      disableHotkeyOutsideApp: true,
      disableOnInputLikeControls: true,
      handler: () => {
        if (requestSelectedPageItemDelete()) {
          return;
        }
        deleteSelectedInstance();
      },
    },
    {
      name: "duplicateInstance",
      description: "Duplicate selected page or instance",
      category: "Navigator",
      defaultHotkeys: ["meta+d", "ctrl+d"],
      handler: () => {
        const project = $project.get();
        if (project === undefined) {
          return;
        }
        if (
          guardDesignModeCommand({
            isDesignMode: $isDesignMode.get(),
            message: "Duplicating is only allowed in design mode.",
          }) === false
        ) {
          return;
        }
        if (duplicatePageActionTarget()) {
          return;
        }
        const instancePath = $selectedInstancePath.get();
        // global root or body are selected
        if (instancePath === undefined || instancePath.length === 1) {
          return;
        }

        updateWebstudioData((data) => {
          const detachedInstancePath = detachSharedSlotContentMutable(
            data,
            instancePath
          );
          const [selectedItem, parentItem] = detachedInstancePath;
          if (parentItem === undefined) {
            return;
          }
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

          // When the original child is auto-placed in a grid, ensure the
          // duplicate is also auto-placed to prevent overlapping items.
          // Manually positioned children keep their exact grid position.
          if (
            isAutoGridPlacement({
              styles: data.styles,
              styleSources: data.styleSources,
              styleSourceSelections: data.styleSourceSelections,
              instanceId: selectedItem.instance.id,
            })
          ) {
            resetGridChildPlacement({
              styles: data.styles,
              styleSources: data.styleSources,
              styleSourceSelections: data.styleSourceSelections,
              instanceId: newRootInstanceId,
            });
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
      description: "Edit instance label",
      category: "Navigator",
      defaultHotkeys: ["meta+e", "ctrl+e"],
      handler: () => {
        if (
          guardDesignModeCommand({
            isDesignMode: $isDesignMode.get(),
            message: "Renaming is only allowed in design mode.",
          }) === false
        ) {
          return;
        }
        const instancePath = $selectedInstancePath.get();
        if (instancePath === undefined) {
          return;
        }
        const [selectedItem] = instancePath;
        $editingItemSelector.set(selectedItem.instanceSelector);
      },
    },
    {
      name: "wrap",
      label: "Wrap",
      description: "Wrap",
      category: "Navigator",
      defaultHotkeys: ["meta+alt+g", "ctrl+alt+g"],
      keepCommandPanelOpen: true,
      handler: () => {
        if (
          guardDesignModeCommand({
            isDesignMode: $isDesignMode.get(),
            message: "Wrapping is only allowed in design mode.",
          }) === false
        ) {
          return;
        }
        showWrapComponentsList();
      },
    },
    {
      name: "unwrap",
      description: "Remove parent wrapper",
      category: "Navigator",
      defaultHotkeys: ["meta+shift+g", "ctrl+shift+g"],
      handler: () => {
        if (
          guardDesignModeCommand({
            isDesignMode: $isDesignMode.get(),
            message: "Unwrapping is only allowed in design mode.",
          })
        ) {
          unwrapInstance();
        }
      },
    },
    {
      name: "convert",
      label: "Convert",
      description: "Convert component",
      category: "Navigator",
      keepCommandPanelOpen: true,
      handler: () => {
        if (
          guardDesignModeCommand({
            isDesignMode: $isDesignMode.get(),
            message: "Converting is only allowed in design mode.",
          }) === false
        ) {
          return;
        }
        showConvertComponentsList();
      },
    },

    {
      name: "pasteTailwind",
      label: "Paste HTML with Tailwind classes",
      description: "Convert Tailwind to CSS",
      handler: async () => {
        if (
          guardDesignModeCommand({
            isDesignMode: $isDesignMode.get(),
            message: "Pasting HTML is only allowed in design mode.",
          }) === false
        ) {
          return;
        }
        const html = await navigator.clipboard.readText();
        const parseResult = generateFragmentFromHtml(html);
        const { skippedSelectors } = parseResult;
        let fragment: WebstudioFragment = parseResult;
        fragment = await denormalizeSrcProps(fragment);
        fragment = await generateFragmentFromTailwind(fragment);
        const result = insertWebstudioFragmentAt(fragment);
        if (skippedSelectors.length > 0) {
          builderApi.toast.info(
            `Skipped nested selectors (no matching elements): ${skippedSelectors.join(", ")}`
          );
        }
        return result;
      },
    },

    // history

    {
      name: "undo",
      description: "Undo last action",
      category: "General",
      // safari use meta+z to reopen closed tabs, here added ctrl as alternative
      defaultHotkeys: ["meta+z", "ctrl+z"],
      disableOnInputLikeControls: true,
      handler: () => {
        serverSyncStore.undo();
      },
    },
    {
      name: "redo",
      description: "Redo last action",
      category: "General",
      // safari use meta+z to reopen closed tabs, here added ctrl as alternative
      defaultHotkeys: ["meta+shift+z", "ctrl+shift+z"],
      disableOnInputLikeControls: true,
      handler: () => {
        serverSyncStore.redo();
      },
    },

    {
      name: "save",
      description: "Save project",
      category: "General",
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
      description: "Open command panel",
      category: "General",
      defaultHotkeys: ["meta+k", "ctrl+k"],
      handler: () => {
        if ($isDesignMode.get()) {
          openCommandPanel();
        }
      },
    },

    {
      name: "deleteUnusedTokens",
      label: "Delete unused tokens",
      description: "Remove unused tokens",
      handler: () => {
        openDeleteUnusedTokensDialog();
      },
    },

    {
      name: "findDuplicateTokens",
      label: "Find duplicate tokens",
      description: "Find tokens with identical styles or names",
      handler: () => {
        // Import needed to avoid circular dependency
        import(
          "~/builder/features/command-panel/groups/duplicate-tokens-group"
        ).then(({ showDuplicateTokensView }) => {
          showDuplicateTokensView();
        });
      },
    },

    {
      name: "deleteUnusedDataVariables",
      label: "Delete unused data variables",
      description: "Remove unused data variables",
      handler: () => {
        openDeleteUnusedDataVariablesDialog();
      },
    },

    {
      name: "deleteUnusedCssVariables",
      label: "Delete unused CSS variables",
      description: "Remove unused CSS variables",
      handler: () => {
        openDeleteUnusedCssVariablesDialog();
      },
    },

    {
      name: "deleteUnusedAssets",
      label: "Delete unused assets",
      description: "Remove unused assets",
      handler: () => {
        openDeleteUnusedAssetsDialog();
      },
    },

    {
      name: "openKeyboardShortcuts",
      description: "View keyboard shortcuts",
      category: "General",
      defaultHotkeys: ["shift+?"],
      disableOnInputLikeControls: true,
      handler: () => {
        openKeyboardShortcutsDialog();
      },
    },
  ],
});
