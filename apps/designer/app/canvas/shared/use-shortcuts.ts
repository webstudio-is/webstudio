import { useHotkeys } from "react-hotkeys-hook";
import store from "immerhin";
import { type Instance, getComponentMeta } from "@webstudio-is/react-sdk";
import { shortcuts, options } from "~/shared/shortcuts";
import { publish, useSubscribe } from "~/shared/pubsub";
import { useSelectedInstance } from "./nano-states";
import { useTextEditingInstanceId } from "~/shared/nano-states";
import { type SelectedInstanceData } from "@webstudio-is/project";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    cancelCurrentDrag: undefined;
    deleteInstance: {
      id: Instance["id"];
    };
    openBreakpointsMenu: undefined;
    selectBreakpointFromShortcut: number;
    selectInstance?: SelectedInstanceData;
    togglePreviewMode: undefined;
    zoom: "zoomOut" | "zoomIn";
  }
}

const inputTags = ["INPUT", "SELECT", "TEXTAREA"] as const;

type HandlerEvent = {
  key?: string;
  preventDefault?: () => void;
};

const togglePreviewMode = () => {
  publish({ type: "togglePreviewMode" });
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

const publishZoom = (event: HandlerEvent) => {
  if (!event.key) {
    throw new Error(
      "`publishZoom` doesn't account for being called without a `key`"
    );
  }
  if (event.preventDefault !== undefined) event.preventDefault();
  publish({
    type: "zoom",
    payload: event.key === "-" ? "zoomOut" : "zoomIn",
  });
};

const publishOpenBreakpointsMenu = () => {
  publish({ type: "openBreakpointsMenu" });
};

const publishCancelCurrentDrag = () => {
  publish({ type: "cancelCurrentDrag" });
};

export const useShortcuts = () => {
  const [selectedInstance, setSelectedInstance] = useSelectedInstance();
  const [editingInstanceId, setEditingInstanceId] = useTextEditingInstanceId();

  const publishDeleteInstance = () => {
    if (selectedInstance === undefined) {
      return;
    }
    publish({
      type: "deleteInstance",
      payload: { id: selectedInstance.id },
    });
  };

  const shortcutHandlerMap = {
    undo: store.undo.bind(store),
    redo: store.redo.bind(store),
    delete: publishDeleteInstance,
    preview: togglePreviewMode,
    breakpointsMenu: publishOpenBreakpointsMenu,
    breakpoint: publishSelectBreakpoint,
    zoom: publishZoom,
    esc: publishCancelCurrentDrag,
  } as const;

  useHotkeys(
    "backspace, delete",
    shortcutHandlerMap.delete,
    { ...options, enableOnTags: [...inputTags] },
    [shortcutHandlerMap.delete]
  );

  useHotkeys(
    "esc",
    () => {
      if (selectedInstance === undefined) return;
      // Since we are in text editing mode, we want to first exit that mode without unselecting the instance.
      if (editingInstanceId) {
        setEditingInstanceId(undefined);
        return;
      }
      setSelectedInstance(undefined);
      publish({ type: "selectInstance" });
    },
    { ...options, enableOnContentEditable: true, enableOnTags: [...inputTags] },
    [selectedInstance, editingInstanceId]
  );

  useHotkeys(
    "enter",
    (event) => {
      if (selectedInstance === undefined) return;
      const { isContentEditable } = getComponentMeta(
        selectedInstance.component
      );
      if (isContentEditable === false) return;
      // Prevents inserting a newline when entering text-editing mode
      event.preventDefault();
      setEditingInstanceId(selectedInstance.id);
    },
    options,
    [selectedInstance, setEditingInstanceId]
  );

  useHotkeys(shortcuts.undo, shortcutHandlerMap.undo, options, []);

  useHotkeys(shortcuts.redo, shortcutHandlerMap.redo, options, []);

  useHotkeys(shortcuts.preview, shortcutHandlerMap.preview, options, []);

  useHotkeys(shortcuts.breakpoint, shortcutHandlerMap.breakpoint, options, []);
  useHotkeys(shortcuts.zoom, shortcutHandlerMap.zoom, options, []);
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
