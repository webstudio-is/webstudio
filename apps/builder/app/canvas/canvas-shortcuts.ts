import { useHotkeys } from "react-hotkeys-hook";
import { shortcuts, instanceTreeShortcuts, options } from "~/shared/shortcuts";
import { publish, useSubscribe } from "~/shared/pubsub";
import { isPreviewModeStore } from "~/shared/nano-states";
import { enterEditingMode, escapeSelection } from "~/shared/instance-utils";

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

export const useCanvasShortcuts = () => {
  const shortcutHandlerMap = {
    preview: togglePreviewMode,
    breakpointsMenu: publishOpenBreakpointsMenu,
    esc: publishCancelCurrentDrag,
    enter: enterEditingMode,
  } as const satisfies Record<
    keyof typeof shortcuts | keyof typeof instanceTreeShortcuts,
    unknown
  >;

  useHotkeys(shortcuts.preview, shortcutHandlerMap.preview, options, []);

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
      // Reset selection for local canvas escape, but not for the Builder escape via useSubscribe
      escapeSelection();
    },
    options,
    []
  );

  useHotkeys(instanceTreeShortcuts.enter, shortcutHandlerMap.enter, {}, []);

  // Shortcuts from the parent window
  useSubscribe("shortcut", ({ name }) => {
    shortcutHandlerMap[name]();
  });
};
