import { useHotkeys } from "react-hotkeys-hook";
import store from "immerhin";
import { type Instance } from "@webstudio-is/sdk";
import { shortcuts } from "~/shared/shortcuts";
import { useRootInstance, useSelectedInstance } from "./nano-values";
import { publish, useSubscribe } from "./pubsub";
import { copy, paste } from "./copy-paste";

const togglePreviewMode = () => {
  publish<"togglePreviewMode">({ type: "togglePreviewMode" });
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
  } as const;

  useHotkeys(
    "backspace, delete",
    shortcutHandlerMap.delete,
    { enableOnTags: ["INPUT", "SELECT", "TEXTAREA"] },
    [shortcutHandlerMap.delete]
  );

  useHotkeys(
    "esc",
    () => {
      if (selectedInstance === undefined) return;
      setSelectedInstance(undefined);
      publish<"selectInstance">({ type: "selectInstance" });
    },
    [selectedInstance]
  );

  useHotkeys(shortcuts.undo, shortcutHandlerMap.undo, []);

  useHotkeys(shortcuts.redo, shortcutHandlerMap.redo, []);

  useHotkeys(shortcuts.preview, shortcutHandlerMap.preview, []);

  useHotkeys(shortcuts.copy, shortcutHandlerMap.copy, [
    shortcutHandlerMap.copy,
  ]);

  useHotkeys(shortcuts.paste, shortcutHandlerMap.paste, []);

  // Shortcuts from the parent window
  useSubscribe<"shortcut", keyof typeof shortcuts>("shortcut", (shortcut) => {
    shortcutHandlerMap[shortcut]();
  });
};
