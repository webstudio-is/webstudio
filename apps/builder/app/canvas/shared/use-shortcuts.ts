import { useHotkeys } from "react-hotkeys-hook";
import { shortcuts, options } from "~/shared/shortcuts";
import { publish, useSubscribe } from "~/shared/pubsub";
import { isPreviewModeStore } from "~/shared/nano-states";

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
  const shortcutHandlerMap = {
    preview: togglePreviewMode,
    breakpointsMenu: publishOpenBreakpointsMenu,
    esc: publishCancelCurrentDrag,
  } as const;

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
