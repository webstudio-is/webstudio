import { useHotkeys } from "react-hotkeys-hook";
import store from "immerhin";
import { getComponentMeta } from "@webstudio-is/react-sdk";
import { shortcuts, options } from "~/shared/shortcuts";
import { publish, useSubscribe } from "~/shared/pubsub";
import {
  selectedInstanceIdStore,
  selectedInstanceStore,
  useTextEditingInstanceId,
  isPreviewModeStore,
} from "~/shared/nano-states";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    cancelCurrentDrag: undefined;
    openBreakpointsMenu: undefined;
    selectBreakpointFromShortcut: number;
  }
}

type HandlerEvent = {
  key?: string;
  preventDefault?: () => void;
};

const togglePreviewMode = () => {
  isPreviewModeStore.set(!isPreviewModeStore.get());
};

const publishSelectBreakpoint = ({ key }: HandlerEvent) => {
  if (!key) {
    throw new Error(
      "`publishSelectBreakpoint` doesn't account for being called without a `key`"
    );
  }
  publish({
    type: "selectBreakpointFromShortcut",
    payload: parseInt(key, 10),
  });
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
    undo: store.undo.bind(store),
    redo: store.redo.bind(store),
    preview: togglePreviewMode,
    breakpointsMenu: publishOpenBreakpointsMenu,
    breakpoint: publishSelectBreakpoint,
    esc: publishCancelCurrentDrag,
  } as const;

  useHotkeys(
    "esc",
    () => {
      const selectedInstanceId = selectedInstanceIdStore.get();
      if (selectedInstanceId === undefined) {
        return;
      }
      // Since we are in text editing mode, we want to first exit that mode without unselecting the instance.
      if (editingInstanceId) {
        setEditingInstanceId(undefined);
        return;
      }
      selectedInstanceIdStore.set(undefined);
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

  useHotkeys(shortcuts.undo, shortcutHandlerMap.undo, options, []);

  useHotkeys(shortcuts.redo, shortcutHandlerMap.redo, options, []);

  useHotkeys(shortcuts.preview, shortcutHandlerMap.preview, options, []);

  useHotkeys(shortcuts.breakpoint, shortcutHandlerMap.breakpoint, options, []);
  useHotkeys(
    shortcuts.breakpointsMenu,
    shortcutHandlerMap.breakpointsMenu,
    options,
    []
  );

  useHotkeys(shortcuts.esc, shortcutHandlerMap.esc, options, []);

  // Shortcuts from the parent window
  useSubscribe("shortcut", ({ name, key }) => {
    shortcutHandlerMap[name]({ key });
  });
};
