import { useHotkeys } from "react-hotkeys-hook";
import { shortcuts, options } from "~/shared/shortcuts";
import { publish, useSubscribe } from "~/shared/pubsub";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    cancelCurrentDrag: undefined;
    openBreakpointsMenu: undefined;
  }
}

const publishOpenBreakpointsMenu = () => {
  publish({ type: "openBreakpointsMenu" });
};

const publishCancelCurrentDrag = () => {
  publish({ type: "cancelCurrentDrag" });
};

export const useCanvasShortcuts = () => {
  const shortcutHandlerMap = {
    breakpointsMenu: publishOpenBreakpointsMenu,
    esc: publishCancelCurrentDrag,
  } as const satisfies Record<keyof typeof shortcuts, unknown>;

  useHotkeys(
    shortcuts.breakpointsMenu,
    shortcutHandlerMap.breakpointsMenu,
    options,
    []
  );

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
