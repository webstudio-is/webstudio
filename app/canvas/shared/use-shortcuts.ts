import { useHotkeys } from "react-hotkeys-hook";
import store from "immerhin";
import { type Instance } from "@webstudio-is/sdk";
import { shortcuts, options } from "~/shared/shortcuts";
import { useRootInstance, useSelectedInstance } from "./nano-values";
import { publish, useSubscribe } from "./pubsub";
import { copy, paste } from "./copy-paste";

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

const publishScale = (event: HandlerEvent) => {
  if (event.preventDefault !== undefined) event.preventDefault();
  publish({
    type: "scale",
    payload: event.key === "-" ? "scaleOut" : "scaleIn",
  });
};

const publishOpenBreakpointsMenu = () => {
  publish({ type: "openBreakpointsMenu" });
};

export const useShortcuts = () => {
  const [rootInstance] = useRootInstance();
  const [selectedInstance, setSelectedInstance] = useSelectedInstance();

  const publishDeleteInstance = () => {
    // @todo tell user they can't delete root
    if (
      selectedInstance === undefined ||
      selectedInstance.id === rootInstance?.id
    ) {
      return;
    }
    publish<"deleteInstance", { id: Instance["id"] }>({
      type: "deleteInstance",
      payload: {
        id: selectedInstance.id,
      },
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
    scale: publishScale,
  } as const;

  useHotkeys(
    "backspace, delete",
    shortcutHandlerMap.delete,
    { ...options, enableOnTags: ["INPUT", "SELECT", "TEXTAREA"] },
    [shortcutHandlerMap.delete]
  );

  useHotkeys(
    "esc",
    () => {
      if (selectedInstance === undefined) return;
      setSelectedInstance(undefined);
      publish<"selectInstance">({ type: "selectInstance" });
    },
    options,
    [selectedInstance]
  );

  useHotkeys(shortcuts.undo, shortcutHandlerMap.undo, options, []);

  useHotkeys(shortcuts.redo, shortcutHandlerMap.redo, options, []);

  useHotkeys(shortcuts.preview, shortcutHandlerMap.preview, options, []);

  useHotkeys(shortcuts.copy, shortcutHandlerMap.copy, options, [
    shortcutHandlerMap.copy,
  ]);

  useHotkeys(shortcuts.paste, shortcutHandlerMap.paste, options, []);

  useHotkeys(shortcuts.breakpoint, shortcutHandlerMap.breakpoint, options, []);
  useHotkeys(shortcuts.scale, shortcutHandlerMap.scale, options, []);
  useHotkeys(
    shortcuts.breakpointsMenu,
    shortcutHandlerMap.breakpointsMenu,
    options,
    []
  );

  // Shortcuts from the parent window
  useSubscribe<"shortcut", { name: keyof typeof shortcuts; key: string }>(
    "shortcut",
    ({ name, key }) => {
      shortcutHandlerMap[name]({ key });
    }
  );
};
