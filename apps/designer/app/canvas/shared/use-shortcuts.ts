import { useHotkeys } from "react-hotkeys-hook";
import store from "immerhin";
import {
  type Instance,
  publish,
  useSubscribe,
  components,
} from "@webstudio-is/react-sdk";
import { shortcuts, options } from "~/shared/shortcuts";
import { useSelectedInstance } from "./nano-states";
import { copy, paste } from "./copy-paste";
import { useTextEditingInstanceId } from "~/shared/nano-states";

const inputTags = ["INPUT", "SELECT", "TEXTAREA"] as const;

type HandlerEvent = {
  key: string;
  preventDefault?: () => void;
};

const togglePreviewMode = () => {
  publish<"togglePreviewMode">({ type: "togglePreviewMode" });
};

const publishSelectBreakpoint = ({ key }: HandlerEvent) => {
  publish({
    type: "selectBreakpointFromShortcut",
    payload: key,
  });
};

const publishZoom = (event: HandlerEvent) => {
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
    publish<"deleteInstance", { id: Instance["id"] }>({
      type: "deleteInstance",
      payload: { id: selectedInstance.id },
    });
  };

  const shortcutHandlerMap = {
    undo: store.undo.bind(store),
    redo: store.redo.bind(store),
    delete: publishDeleteInstance,
    preview: togglePreviewMode,
    copy,
    paste,
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
      publish<"selectInstance">({ type: "selectInstance" });
    },
    { ...options, enableOnContentEditable: true, enableOnTags: [...inputTags] },
    [selectedInstance, editingInstanceId]
  );

  useHotkeys(
    "enter",
    (event) => {
      if (selectedInstance === undefined) return;
      const { isContentEditable } = components[selectedInstance.component];
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

  useHotkeys(shortcuts.copy, shortcutHandlerMap.copy, options, [
    shortcutHandlerMap.copy,
  ]);

  useHotkeys(shortcuts.paste, shortcutHandlerMap.paste, options, []);

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
  useSubscribe<"shortcut", { name: keyof typeof shortcuts; key: string }>(
    "shortcut",
    ({ name, key }) => {
      shortcutHandlerMap[name]({ key });
    }
  );
};
