import { useHotkeys } from "react-hotkeys-hook";
import { type Instance } from "@webstudio-is/sdk";
import { useRootInstance, useSelectedInstance } from "./nano-values";
import { publish, useSubscribe } from "./pubsub";
import store from "immerhin";
import { shortcuts } from "~/shared/shortcuts";

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
  } as const;

  useHotkeys(
    "backspace, delete",
    publishDeleteInstance,
    { enableOnTags: ["INPUT", "SELECT", "TEXTAREA"] },
    [selectedInstance]
  );

  useHotkeys(
    "esc",
    () => {
      if (selectedInstance === undefined) return;
      setSelectedInstance(undefined);
      publish<"selectInstance", undefined>({
        type: "selectInstance",
        payload: undefined,
      });
    },
    [selectedInstance]
  );

  useHotkeys(
    // Undo
    shortcuts.undo,
    shortcutHandlerMap.undo,
    []
  );

  useHotkeys(
    // Redo
    shortcuts.redo,
    shortcutHandlerMap.redo,
    []
  );

  // Shortcuts from the parent window
  useSubscribe<"shortcut", keyof typeof shortcuts>("shortcut", (shortcut) => {
    shortcutHandlerMap[shortcut]();
  });
};
