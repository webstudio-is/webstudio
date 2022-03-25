import { useHotkeys } from "react-hotkeys-hook";
import { type Instance } from "@webstudio-is/sdk";
import { useSelectedInstance } from "./nano-values";
import { publish } from "./pubsub";
import { redo, undo } from "./undo-redo";

export const useShortcuts = ({ rootInstance }: { rootInstance: Instance }) => {
  const [instance, setSelectedInstance] = useSelectedInstance();
  useHotkeys(
    "backspace, delete",
    () => {
      // @todo tell user they can't delete root
      if (instance === undefined || instance.id === rootInstance.id) return;
      publish<"deleteInstace", { id: Instance["id"] }>({
        type: "deleteInstace",
        payload: {
          id: instance.id,
        },
      });
    },
    { enableOnTags: ["INPUT", "SELECT", "TEXTAREA"] },
    [instance]
  );

  useHotkeys(
    "esc",
    () => {
      if (instance === undefined) return;
      setSelectedInstance(undefined);
      publish<"selectInstance", undefined>({
        type: "selectInstance",
        payload: undefined,
      });
    },
    [instance]
  );

  useHotkeys(
    // Undo
    "cmd+z, ctrl+z",
    undo,
    []
  );

  useHotkeys(
    // Redo
    "cmd+shift+z, ctrl+shift+z",
    redo,
    []
  );
};
