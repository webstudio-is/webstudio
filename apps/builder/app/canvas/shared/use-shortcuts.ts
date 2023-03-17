import { useHotkeys } from "react-hotkeys-hook";
import { getComponentMeta } from "@webstudio-is/react-sdk";
import { shortcuts, options } from "~/shared/shortcuts";
import { publish, useSubscribe } from "~/shared/pubsub";
import {
  selectedInstanceSelectorStore,
  selectedInstanceStore,
  useTextEditingInstanceId,
  isPreviewModeStore,
} from "~/shared/nano-states";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    cancelCurrentDrag: undefined;
    openBreakpointsMenu: undefined;
  }
}

const togglePreviewMode = () => {
  isPreviewModeStore.set(!isPreviewModeStore.get());
};

const publishOpenBreakpointsMenu = () => {
  publish({ type: "openBreakpointsMenu" });
};

const publishCancelCurrentDrag = () => {
  publish({ type: "cancelCurrentDrag" });
};

export const useShortcuts = () => {
  const [editingInstanceId, setEditingInstanceId] = useTextEditingInstanceId();

  const shortcutHandlerMap = {
    preview: togglePreviewMode,
    breakpointsMenu: publishOpenBreakpointsMenu,
    esc: publishCancelCurrentDrag,
  } as const;

  useHotkeys(
    "esc",
    () => {
      const selectedInstanceSelector = selectedInstanceSelectorStore.get();
      if (selectedInstanceSelector === undefined) {
        return;
      }
      // Since we are in text editing mode, we want to first exit that mode without unselecting the instance.
      if (editingInstanceId) {
        setEditingInstanceId(undefined);
        return;
      }
      selectedInstanceSelectorStore.set(undefined);
    },
    { ...options, enableOnContentEditable: true },
    [editingInstanceId]
  );

  useHotkeys(
    "enter",
    (event) => {
      const selectedInstance = selectedInstanceStore.get();
      if (selectedInstance === undefined) {
        return;
      }
      const meta = getComponentMeta(selectedInstance.component);
      if (meta?.type === "rich-text") {
        // Prevents inserting a newline when entering text-editing mode
        event.preventDefault();
        setEditingInstanceId(selectedInstance.id);
      }
    },
    options,
    [setEditingInstanceId]
  );

  useHotkeys(shortcuts.preview, shortcutHandlerMap.preview, options, []);

  useHotkeys(
    shortcuts.breakpointsMenu,
    shortcutHandlerMap.breakpointsMenu,
    options,
    []
  );

  useHotkeys(shortcuts.esc, shortcutHandlerMap.esc, options, []);

  // Shortcuts from the parent window
  useSubscribe("shortcut", ({ name }) => {
    shortcutHandlerMap[name]();
  });
};
