import { useHotkeys } from "react-hotkeys-hook";
import { shortcuts, options } from "~/shared/shortcuts";
import { publish, useSubscribe } from "~/shared/pubsub";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    cancelCurrentDrag: undefined;
  }
}

const publishCancelCurrentDrag = () => {
  publish({ type: "cancelCurrentDrag" });
};

export const useCanvasShortcuts = () => {
  const shortcutHandlerMap = {
    esc: publishCancelCurrentDrag,
  } as const satisfies Record<keyof typeof shortcuts, unknown>;

  useHotkeys(
    shortcuts.esc,
    () => {
      shortcutHandlerMap.esc();
    },
    options,
    []
  );

  // Shortcuts from the parent window
  useSubscribe("shortcut", ({ name }) => {
    shortcutHandlerMap[name]();
  });
};
